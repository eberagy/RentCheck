/**
 * San Francisco Assessor-Recorder Secured Property Tax Roll
 * Source: SF Open Data (DataSF)
 * API: https://data.sfgov.org/resource/wv5m-vpq2.json (Socrata)
 * ~200k tax parcels with owner names, addresses, property class
 *
 * Primary source for SF property→landlord links.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeAddress, type SyncResult } from './utils'
import slugify from 'slugify'

const ENDPOINTS = [
  'https://data.sfgov.org/resource/wv5m-vpq2.json',  // Secured Property Tax Roll 2024
  'https://data.sfgov.org/resource/58di-q9iv.json',  // Assessor historical
  'https://data.sfgov.org/resource/9i2n-bmwp.json',  // Property data alt
]

const PAGE_SIZE = 2000

const RESIDENTIAL_CODES = ['R', 'A', 'C', 'D', 'RH', 'RM', 'RTO', 'NCT']

export async function syncSfAssessor(supabase: SupabaseClient): Promise<SyncResult> {
  const result: SyncResult = { added: 0, updated: 0, skipped: 0, errors: [] }

  let workingEndpoint: string | null = null
  for (const ep of ENDPOINTS) {
    try {
      const probe = await fetch(`${ep}?$limit=1`, { signal: AbortSignal.timeout(10000) })
      if (probe.ok) {
        const data = await probe.json()
        if (Array.isArray(data) && data.length > 0) { workingEndpoint = ep; break }
      }
    } catch { /* try next */ }
  }

  if (!workingEndpoint) {
    // Catalog discovery fallback
    try {
      const cat = await fetch(
        `https://api.us.socrata.com/api/catalog/v1?domains=data.sfgov.org&q=assessor+property+owner&limit=5&only=datasets`,
        { signal: AbortSignal.timeout(10000) }
      )
      if (cat.ok) {
        const { results } = await cat.json()
        for (const r of results ?? []) {
          const id = r.resource?.id
          if (!id) continue
          const ep = `https://data.sfgov.org/resource/${id}.json`
          try {
            const probe = await fetch(`${ep}?$limit=1`, { signal: AbortSignal.timeout(6000) })
            if (probe.ok) { const rows = await probe.json(); if (Array.isArray(rows) && rows.length > 0) { workingEndpoint = ep; break } }
          } catch { /* try next */ }
        }
      }
    } catch { /* unavailable */ }
  }

  if (!workingEndpoint) {
    result.errors.push('No working SF Assessor endpoint.')
    return result
  }

  let offset = 0
  const processedOwners = new Map<string, string>()

  while (true) {
    const u = new URL(workingEndpoint)
    u.searchParams.set('$where', 'owner_name IS NOT NULL')
    u.searchParams.set('$select', 'blklot,from_address_num,street_name,street_type,unit_num,zip_code,owner_name,property_class_code_definition,number_of_units,year_property_built')
    u.searchParams.set('$limit', String(PAGE_SIZE))
    u.searchParams.set('$offset', String(offset))
    u.searchParams.set('$order', 'blklot')

    let rows: any[]
    try {
      const res = await fetch(u.toString(), {
        headers: { 'X-App-Token': process.env.NYC_OPEN_DATA_TOKEN ?? '' },
        signal: AbortSignal.timeout(30000),
      })
      if (!res.ok) {
        // Try without filter
        const fallback = await fetch(`${workingEndpoint}?$limit=${PAGE_SIZE}&$offset=${offset}&$order=:id`, { signal: AbortSignal.timeout(30000) })
        if (!fallback.ok) { result.errors.push(`HTTP ${fallback.status}`); break }
        rows = await fallback.json()
      } else {
        rows = await res.json()
      }
      if (!Array.isArray(rows)) break
    } catch (e) {
      result.errors.push(e instanceof Error ? e.message : String(e)); break
    }
    if (rows.length === 0) break

    for (const row of rows) {
      try {
        const rawOwner = row.owner_name?.trim() ?? ''
        if (!rawOwner) { result.skipped++; continue }

        const ownerName = cleanOwnerName(rawOwner)
        if (!ownerName || isGovernmentOwner(ownerName)) { result.skipped++; continue }

        // Build address from components
        const parts = [row.from_address_num, row.street_name, row.street_type].filter(Boolean)
        if (row.unit_num) parts.push(`#${row.unit_num}`)
        const address = parts.join(' ').trim()
        if (!address) { result.skipped++; continue }

        const zip = row.zip_code ?? ''
        const addrNorm = normalizeAddress(address)
        const ownerKey = ownerName.toLowerCase()

        let landlordId = processedOwners.get(ownerKey)
        if (!landlordId) {
          const { data: existing } = await supabase
            .from('landlords')
            .select('id')
            .ilike('display_name', ownerName)
            .eq('state_abbr', 'CA')
            .limit(1)
            .single()

          if (existing) {
            landlordId = existing.id
          } else {
            const baseSlug = slugify(`${ownerName}-sf`, { lower: true, strict: true })
            const suffix = Math.random().toString(36).slice(2, 6)
            const { data: newLandlord } = await supabase
              .from('landlords')
              .insert({
                display_name: ownerName,
                slug: `${baseSlug}-${suffix}`,
                city: 'San Francisco',
                state: 'California',
                state_abbr: 'CA',
                zip,
              })
              .select('id')
              .single()
            landlordId = newLandlord?.id ?? null
            if (landlordId) result.added++
          }
          if (landlordId) processedOwners.set(ownerKey, landlordId)
        }

        if (landlordId && address) {
          await supabase.from('properties').upsert({
            address_line1: address,
            city: 'San Francisco',
            state: 'California',
            state_abbr: 'CA',
            zip,
            address_normalized: addrNorm,
            landlord_id: landlordId,
            unit_count: row.number_of_units ? parseInt(row.number_of_units) : null,
            year_built: row.year_property_built ? parseInt(row.year_property_built) : null,
          }, { onConflict: 'address_normalized,city,state_abbr', ignoreDuplicates: false })
        }
      } catch (e) {
        result.errors.push(e instanceof Error ? e.message : String(e))
      }
    }

    offset += PAGE_SIZE
    if (rows.length < PAGE_SIZE) break
    if (offset > 200000) break
  }

  return result
}

function cleanOwnerName(raw: string): string | null {
  if (!raw) return null
  const name = raw.trim()
    .replace(/\s+/g, ' ')
    .replace(/^[A-Z\s&.,'-]+$/, (s: string) => toTitleCase(s))
  if (name.length < 2 || name.length > 120) return null
  return name || null
}

function toTitleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase())
}

const GOV_KEYWORDS = [
  'city and county of san francisco', 'city of sf', 'sfmta', 'sfpuc',
  'state of california', 'united states', 'dept of', 'department of',
  'board of education', 'sf unified', 'federal', 'housing authority',
]

function isGovernmentOwner(name: string): boolean {
  const lower = name.toLowerCase()
  return GOV_KEYWORDS.some(kw => lower.includes(kw))
}
