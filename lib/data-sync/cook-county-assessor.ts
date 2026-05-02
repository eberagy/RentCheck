/**
 * Cook County (Chicago) Assessor Property Data
 * Source: Cook County Assessor's Office
 * API: https://datacatalog.cookcountyil.gov (Socrata)
 *
 * Contains all Cook County properties with owner names, addresses, and property class.
 * Filtered to residential/multifamily only.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeAddress, type SyncResult } from './utils'
import slugify from 'slugify'

const ENDPOINTS = [
  // Cook County Assessor - Residential Property Characteristics
  'https://datacatalog.cookcountyil.gov/resource/tx2p-k2g9.json',
  // Cook County Assessor - Property Sales (has owner names)
  'https://datacatalog.cookcountyil.gov/resource/93st-4bxh.json',
]

const PAGE_SIZE = 1000

export async function syncCookCountyAssessor(supabase: SupabaseClient): Promise<SyncResult> {
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
    result.errors.push('Cook County Assessor endpoint unavailable.')
    return result
  }

  const processedOwners = new Map<string, string>()
  let offset = 0

  while (true) {
    // Filter for multifamily residential: class 211 (2-6 units), 212 (7+ units), 318 (mixed use)
    // Use most recent year only; field names: mail_address_name (owner), prop_address_full (address)
    const u = new URL(workingEndpoint)
    u.searchParams.set('$where', `mail_address_name IS NOT NULL AND year = '2023' AND (class = '211' OR class = '212' OR class = '318' OR class = '313')`)
    u.searchParams.set('$select', 'mail_address_name,prop_address_full,class,prop_address_city_name,prop_address_zipcode_1')
    u.searchParams.set('$limit', String(PAGE_SIZE))
    u.searchParams.set('$offset', String(offset))
    u.searchParams.set('$order', ':id')
    let rows: any[]
    try {
      const res = await fetch(u.toString(), { signal: AbortSignal.timeout(15000) })
      if (!res.ok) { result.errors.push(`HTTP ${res.status}`); break }
      rows = await res.json()
      if (!Array.isArray(rows)) break
    } catch {
      // Fall back to no filter
      try {
        const fallback = await fetch(`${workingEndpoint}?$limit=${PAGE_SIZE}&$offset=${offset}&$order=:id`, {
          signal: AbortSignal.timeout(15000)
        })
        if (!fallback.ok) { result.errors.push(`HTTP ${fallback.status}`); break }
        rows = await fallback.json()
      } catch (e2) {
        result.errors.push(e2 instanceof Error ? e2.message : String(e2)); break
      }
    }
    if (rows.length === 0) break

    for (const row of rows) {
      try {
        const ownerRaw = row.mail_address_name ?? null
        if (!ownerRaw) { result.skipped++; continue }
        const ownerName = ownerRaw.trim()
          .replace(/\s+/g, ' ')
          .replace(/^[A-Z\s&.,'-]+$/, (s: string) => s.toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase()))

        if (!ownerName || isGovernmentOwner(ownerName)) { result.skipped++; continue }

        const streetNum = row.prop_address_full ?? ''
        const municipality = row.prop_address_city_name ?? 'Chicago'
        const zip = row.prop_address_zipcode_1 ?? ''

        if (!streetNum) { result.skipped++; continue }

        const addrNorm = normalizeAddress(streetNum)
        const ownerKey = ownerName.toLowerCase()

        let landlordId = processedOwners.get(ownerKey)
        if (!landlordId) {
          const { data: existing } = await supabase
            .from('landlords')
            .select('id')
            .ilike('display_name', ownerName)
            .eq('state_abbr', 'IL')
            .limit(1)
            .single()

          if (existing) {
            landlordId = existing.id
          } else {
            const baseSlug = slugify(`${ownerName}-chicago`, { lower: true, strict: true })
            const suffix = Math.random().toString(36).slice(2, 6)
            const { data: newLandlord } = await supabase
              .from('landlords')
              .insert({
                display_name: ownerName,
                slug: `${baseSlug}-${suffix}`,
                city: municipality,
                state: 'Illinois',
                state_abbr: 'IL',
                zip,
              })
              .select('id')
              .single()
            landlordId = newLandlord?.id ?? null
            if (landlordId) result.added++
          }
          if (landlordId) processedOwners.set(ownerKey, landlordId)
        }

        if (landlordId && streetNum) {
          await supabase.from('properties').upsert({
            address_line1: streetNum,
            city: municipality,
            state: 'Illinois',
            state_abbr: 'IL',
            zip,
            address_normalized: addrNorm,
            landlord_id: landlordId,
            year_built: null,
            unit_count: row.class === '212' ? 7 : (row.class === '211' ? 3 : null),
          }, { onConflict: 'address_normalized,city,state_abbr', ignoreDuplicates: false })
        }
      } catch (e) {
        result.errors.push(e instanceof Error ? e.message : String(e))
      }
    }

    offset += PAGE_SIZE
    if (rows.length < PAGE_SIZE) break
    if (offset > 100000) break
  }

  return result
}

const GOV_KEYWORDS = [
  'city of chicago', 'chicago housing authority', 'cha', 'cook county',
  'state of illinois', 'federal', 'united states', 'secretary of',
  'department of', 'board of education', 'park district',
]

function isGovernmentOwner(name: string): boolean {
  const lower = name.toLowerCase()
  return GOV_KEYWORDS.some(kw => lower.includes(kw))
}
