/**
 * Los Angeles County Assessor Property Data
 * Source: LA County Open Data
 * Covers unincorporated LA County + all cities (Inglewood, Compton, Glendale, etc.)
 * Different from City of LA syncs — covers the entire county footprint.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeAddress, type SyncResult } from './utils'
import slugify from 'slugify'

const KNOWN_IDS = [
  process.env.LA_COUNTY_DATASET,
  '8489-uv2b',  // LA County Assessor parcels
  'xvq2-5ucq',  // Property ownership
  'c8sz-4pca',  // LA County parcels with owners
].filter(Boolean) as string[]

const DOMAINS = ['data.lacounty.gov', 'assessor.lacounty.gov', 'opendata.lacounty.gov']

async function findWorkingEndpoint(): Promise<string | null> {
  for (const domain of DOMAINS) {
    for (const id of KNOWN_IDS) {
      const ep = `https://${domain}/resource/${id}.json`
      try {
        const res = await fetch(`${ep}?$limit=1`, { signal: AbortSignal.timeout(8000) })
        if (res.ok) {
          const rows = await res.json()
          if (Array.isArray(rows) && rows.length > 0) return ep
        }
      } catch { /* try next */ }
    }
    // Catalog discovery per domain
    try {
      const cat = await fetch(
        `https://api.us.socrata.com/api/catalog/v1?domains=${domain}&q=property+owner+assessor&limit=5&only=datasets`,
        { signal: AbortSignal.timeout(10000) }
      )
      if (cat.ok) {
        const { results } = await cat.json()
        for (const r of results ?? []) {
          const id = r.resource?.id
          if (!id) continue
          const ep = `https://${domain}/resource/${id}.json`
          try {
            const probe = await fetch(`${ep}?$limit=1`, { signal: AbortSignal.timeout(6000) })
            if (probe.ok) { const rows = await probe.json(); if (Array.isArray(rows) && rows.length > 0) return ep }
          } catch { /* try next */ }
        }
      }
    } catch { /* unavailable */ }
  }
  return null
}

const PAGE_SIZE = 2000

export async function syncLaCountyAssessor(supabase: SupabaseClient): Promise<SyncResult> {
  const result: SyncResult = { added: 0, updated: 0, skipped: 0, errors: [] }

  const endpoint = await findWorkingEndpoint()
  if (!endpoint) {
    result.errors.push('No working LA County assessor endpoint. Set LA_COUNTY_DATASET env var from data.lacounty.gov.')
    return result
  }

  let offset = 0
  const processedOwners = new Map<string, string>()

  while (true) {
    const url = `${endpoint}?$limit=${PAGE_SIZE}&$offset=${offset}&$order=:id`
    let rows: any[]
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(30000) })
      if (!res.ok) { result.errors.push(`HTTP ${res.status}`); break }
      rows = await res.json()
      if (!Array.isArray(rows)) break
    } catch (e) {
      result.errors.push(e instanceof Error ? e.message : String(e)); break
    }
    if (rows.length === 0) break

    for (const row of rows) {
      try {
        const rawOwner = row.owner_name ?? row.taxpayer ?? row.mail_name ?? row.ownername ?? row.owner ?? ''
        if (!rawOwner?.trim()) { result.skipped++; continue }

        const ownerName = cleanOwnerName(rawOwner.trim())
        if (!ownerName || isGovernmentOwner(ownerName)) { result.skipped++; continue }

        const address = (row.situs_address ?? row.address ?? row.property_address ?? row.site_address ?? '').trim()
        if (!address) { result.skipped++; continue }

        const city = (row.situs_city ?? row.city ?? row.municipality ?? 'Los Angeles').trim()
        const zip = row.situs_zip ?? row.zip_code ?? row.zipcode ?? ''
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
            const baseSlug = slugify(`${ownerName}-la-county`, { lower: true, strict: true })
            const suffix = Math.random().toString(36).slice(2, 6)
            const { data: newLandlord } = await supabase
              .from('landlords')
              .insert({
                display_name: ownerName,
                slug: `${baseSlug}-${suffix}`,
                city: city || 'Los Angeles',
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
            city: city || 'Los Angeles',
            state: 'California',
            state_abbr: 'CA',
            zip,
            address_normalized: addrNorm,
            landlord_id: landlordId,
            year_built: row.year_built ? parseInt(row.year_built) : null,
            unit_count: row.units ?? row.num_units ?? null,
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
  let name = raw.trim()
    .replace(/\s+/g, ' ')
    .replace(/^[A-Z\s&.,'-]+$/, (s: string) => toTitleCase(s))
  if (name.length < 2 || name.length > 120) return null
  return name || null
}

function toTitleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase())
}

const GOV_KEYWORDS = [
  'county of los angeles', 'los angeles county', 'city of los angeles',
  'housing authority', 'state of california', 'united states',
  'dept of', 'department of', 'board of', 'federal', 'school district',
]

function isGovernmentOwner(name: string): boolean {
  const lower = name.toLowerCase()
  return GOV_KEYWORDS.some(kw => lower.includes(kw))
}
