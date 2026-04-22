/**
 * Harris County (Houston) Property Ownership
 * Source: Harris County Open Data / City of Houston Open Data
 * Uses Socrata catalog discovery
 *
 * Harris County is home to Houston — one of the largest rental markets in the US.
 * The Harris County Appraisal District (HCAD) has public ownership data.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeAddress, type SyncResult } from './utils'
import slugify from 'slugify'

const KNOWN_ENDPOINTS = [
  // Houston Open Data (Socrata)
  { domain: 'data.houstontx.gov', ids: [
    process.env.HARRIS_COUNTY_DATASET,
    '5s7r-pzrn',  // Houston Property Data
    'ygqz-usde',  // Harris County properties
    'zrh9-grm6',  // Houston permits/properties
  ].filter(Boolean) as string[] },
]

const PAGE_SIZE = 2000

async function findWorkingEndpoint(): Promise<string | null> {
  for (const { domain, ids } of KNOWN_ENDPOINTS) {
    for (const id of ids) {
      const ep = `https://${domain}/resource/${id}.json`
      try {
        const res = await fetch(`${ep}?$limit=1`, { signal: AbortSignal.timeout(8000) })
        if (res.ok) {
          const rows = await res.json()
          if (Array.isArray(rows) && rows.length > 0) return ep
        }
      } catch { /* try next */ }
    }
  }
  // Catalog discovery on Houston domain
  try {
    const cat = await fetch(
      `https://api.us.socrata.com/api/catalog/v1?domains=data.houstontx.gov&q=property+owner+parcel&limit=5&only=datasets`,
      { signal: AbortSignal.timeout(10000) }
    )
    if (cat.ok) {
      const { results } = await cat.json()
      for (const r of results ?? []) {
        const id = r.resource?.id
        if (!id) continue
        const ep = `https://data.houstontx.gov/resource/${id}.json`
        try {
          const probe = await fetch(`${ep}?$limit=1`, { signal: AbortSignal.timeout(6000) })
          if (probe.ok) { const rows = await probe.json(); if (Array.isArray(rows) && rows.length > 0) return ep }
        } catch { /* try next */ }
      }
    }
  } catch { /* unavailable */ }
  return null
}

export async function syncHarrisCountyAssessor(supabase: SupabaseClient): Promise<SyncResult> {
  const result: SyncResult = { added: 0, updated: 0, skipped: 0, errors: [] }

  const endpoint = await findWorkingEndpoint()
  if (!endpoint) {
    result.errors.push('No working Harris County assessor endpoint. Set HARRIS_COUNTY_DATASET env var from data.houstontx.gov.')
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
        const rawOwner = row.owner_name ?? row.taxpayer_name ?? row.owner ?? row.mail_name ?? ''
        if (!rawOwner?.trim()) { result.skipped++; continue }

        const ownerName = cleanOwnerName(rawOwner.trim())
        if (!ownerName || isGovernmentOwner(ownerName)) { result.skipped++; continue }

        const address = (row.situs_address ?? row.address ?? row.property_address ?? row.site_addr ?? '').trim()
        if (!address) { result.skipped++; continue }

        const zip = row.zip_code ?? row.zipcode ?? row.situs_zip ?? ''
        const addrNorm = normalizeAddress(address)
        const ownerKey = ownerName.toLowerCase()

        let landlordId = processedOwners.get(ownerKey)
        if (!landlordId) {
          const { data: existing } = await supabase
            .from('landlords')
            .select('id')
            .ilike('display_name', ownerName)
            .eq('state_abbr', 'TX')
            .limit(1)
            .single()

          if (existing) {
            landlordId = existing.id
          } else {
            const baseSlug = slugify(`${ownerName}-houston`, { lower: true, strict: true })
            const suffix = Math.random().toString(36).slice(2, 6)
            const { data: newLandlord } = await supabase
              .from('landlords')
              .insert({
                display_name: ownerName,
                slug: `${baseSlug}-${suffix}`,
                city: 'Houston',
                state: 'Texas',
                state_abbr: 'TX',
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
            city: 'Houston',
            state: 'Texas',
            state_abbr: 'TX',
            zip,
            address_normalized: addrNorm,
            landlord_id: landlordId,
            year_built: row.year_built ?? row.yr_blt ? parseInt(row.year_built ?? row.yr_blt) : null,
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
  'city of houston', 'harris county', 'houston housing authority',
  'state of texas', 'united states', 'dept of', 'department of',
  'board of', 'federal', 'school district', 'isd', 'metropolitan transit',
]

function isGovernmentOwner(name: string): boolean {
  const lower = name.toLowerCase()
  return GOV_KEYWORDS.some(kw => lower.includes(kw))
}
