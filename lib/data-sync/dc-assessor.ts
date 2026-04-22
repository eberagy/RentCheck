/**
 * Washington DC Property Ownership (CAMA)
 * Source: DC Open Data
 * API: opendata.dc.gov (Socrata)
 *
 * Computer-Assisted Mass Appraisal data with owner names and property details.
 * Good source for DC landlord→property links.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeAddress, type SyncResult } from './utils'
import slugify from 'slugify'

const DOMAIN = 'opendata.dc.gov'
const KNOWN_IDS = [
  process.env.DC_ASSESSOR_DATASET,
  'usc3-nqzm',  // DC Real Property Sales
  'jfxt-n2u9',  // DC Real Property Tax Assessment
  'xt3q-kkkr',  // DC properties with owners
  'jh2k-5gfw',  // CAMA Residential
].filter(Boolean) as string[]

const PAGE_SIZE = 2000

async function findWorkingEndpoint(): Promise<string | null> {
  for (const id of KNOWN_IDS) {
    const ep = `https://${DOMAIN}/resource/${id}.json`
    try {
      const res = await fetch(`${ep}?$limit=1`, { signal: AbortSignal.timeout(8000) })
      if (res.ok) {
        const rows = await res.json()
        if (Array.isArray(rows) && rows.length > 0) return ep
      }
    } catch { /* try next */ }
  }
  try {
    const cat = await fetch(
      `https://api.us.socrata.com/api/catalog/v1?domains=${DOMAIN}&q=property+owner+assessment&limit=5&only=datasets`,
      { signal: AbortSignal.timeout(10000) }
    )
    if (cat.ok) {
      const { results } = await cat.json()
      for (const r of results ?? []) {
        const id = r.resource?.id
        if (!id) continue
        const ep = `https://${DOMAIN}/resource/${id}.json`
        try {
          const probe = await fetch(`${ep}?$limit=1`, { signal: AbortSignal.timeout(6000) })
          if (probe.ok) { const rows = await probe.json(); if (Array.isArray(rows) && rows.length > 0) return ep }
        } catch { /* try next */ }
      }
    }
  } catch { /* catalog unavailable */ }
  return null
}

export async function syncDcAssessor(supabase: SupabaseClient): Promise<SyncResult> {
  const result: SyncResult = { added: 0, updated: 0, skipped: 0, errors: [] }

  const endpoint = await findWorkingEndpoint()
  if (!endpoint) {
    result.errors.push('No working DC assessor endpoint. Set DC_ASSESSOR_DATASET env var from opendata.dc.gov.')
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
        const rawOwner = row.ownername ?? row.owner_name ?? row.owner ?? row.grantee ?? ''
        if (!rawOwner?.trim()) { result.skipped++; continue }

        const ownerName = cleanOwnerName(rawOwner.trim())
        if (!ownerName || isGovernmentOwner(ownerName)) { result.skipped++; continue }

        const address = (row.address ?? row.property_address ?? row.premiseadd ?? row.ssl ?? '').trim()
        if (!address || /^\d{4}-\d{4}$/.test(address)) { result.skipped++; continue } // Skip SSL-only entries

        const zip = row.zipcode ?? row.zip ?? ''
        const addrNorm = normalizeAddress(address)
        const ownerKey = ownerName.toLowerCase()

        let landlordId = processedOwners.get(ownerKey)
        if (!landlordId) {
          const { data: existing } = await supabase
            .from('landlords')
            .select('id')
            .ilike('display_name', ownerName)
            .eq('state_abbr', 'DC')
            .limit(1)
            .single()

          if (existing) {
            landlordId = existing.id
          } else {
            const baseSlug = slugify(`${ownerName}-dc`, { lower: true, strict: true })
            const suffix = Math.random().toString(36).slice(2, 6)
            const { data: newLandlord } = await supabase
              .from('landlords')
              .insert({
                display_name: ownerName,
                slug: `${baseSlug}-${suffix}`,
                city: 'Washington',
                state: 'District of Columbia',
                state_abbr: 'DC',
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
            city: 'Washington',
            state: 'District of Columbia',
            state_abbr: 'DC',
            zip,
            address_normalized: addrNorm,
            landlord_id: landlordId,
            year_built: row.ayb ?? row.yr_built ? parseInt(row.ayb ?? row.yr_built) : null,
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
  'district of columbia', 'dc government', 'united states', 'dept of',
  'department of', 'board of', 'federal', 'navy', 'army', 'usps',
  'national park', 'smithsonian', 'washington metropolitan',
]

function isGovernmentOwner(name: string): boolean {
  const lower = name.toLowerCase()
  return GOV_KEYWORDS.some(kw => lower.includes(kw))
}
