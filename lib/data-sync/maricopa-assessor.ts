/**
 * Maricopa County (Phoenix) Property Ownership
 * Source: Maricopa County Assessor / City of Phoenix Open Data
 * Uses Socrata catalog discovery
 *
 * Maricopa County is home to Phoenix, Scottsdale, Tempe, Mesa — large rental market.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeAddress, type SyncResult } from './utils'
import slugify from 'slugify'

const KNOWN_ENDPOINTS = [
  { domain: 'data.phoenix.gov', ids: [
    process.env.MARICOPA_DATASET,
    'jjaf-n4xy',  // Phoenix property data
    'xi5n-x7nv',  // Rental properties
    'uzq9-jh2i',  // Property records
  ].filter(Boolean) as string[] },
]

const PAGE_SIZE = 2000

async function findWorkingEndpoint(): Promise<{ ep: string; domain: string } | null> {
  for (const { domain, ids } of KNOWN_ENDPOINTS) {
    for (const id of ids) {
      const ep = `https://${domain}/resource/${id}.json`
      try {
        const res = await fetch(`${ep}?$limit=1`, { signal: AbortSignal.timeout(8000) })
        if (res.ok) {
          const rows = await res.json()
          if (Array.isArray(rows) && rows.length > 0) return { ep, domain }
        }
      } catch { /* try next */ }
    }
  }
  // Try catalog discovery
  for (const domain of ['data.phoenix.gov', 'data.maricopacounty.gov']) {
    try {
      const cat = await fetch(
        `https://api.us.socrata.com/api/catalog/v1?domains=${domain}&q=property+owner+parcel&limit=5&only=datasets`,
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
            if (probe.ok) { const rows = await probe.json(); if (Array.isArray(rows) && rows.length > 0) return { ep, domain } }
          } catch { /* try next */ }
        }
      }
    } catch { /* unavailable */ }
  }
  return null
}

export async function syncMaricopaAssessor(supabase: SupabaseClient): Promise<SyncResult> {
  const result: SyncResult = { added: 0, updated: 0, skipped: 0, errors: [] }

  const found = await findWorkingEndpoint()
  if (!found) {
    result.errors.push('No working Maricopa/Phoenix assessor endpoint. Set MARICOPA_DATASET env var from data.phoenix.gov.')
    return result
  }

  const { ep: endpoint } = found
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
        const rawOwner = row.owner_name ?? row.taxpayer_name ?? row.owner ?? row.grantor ?? ''
        if (!rawOwner?.trim()) { result.skipped++; continue }

        const ownerName = cleanOwnerName(rawOwner.trim())
        if (!ownerName || isGovernmentOwner(ownerName)) { result.skipped++; continue }

        const address = (row.address ?? row.situs_address ?? row.property_address ?? row.site_address ?? '').trim()
        if (!address) { result.skipped++; continue }

        const zip = row.zip_code ?? row.zipcode ?? row.zip ?? ''
        const addrNorm = normalizeAddress(address)
        const ownerKey = ownerName.toLowerCase()

        let landlordId = processedOwners.get(ownerKey)
        if (!landlordId) {
          const { data: existing } = await supabase
            .from('landlords')
            .select('id')
            .ilike('display_name', ownerName)
            .eq('state_abbr', 'AZ')
            .limit(1)
            .single()

          if (existing) {
            landlordId = existing.id
          } else {
            const baseSlug = slugify(`${ownerName}-phoenix`, { lower: true, strict: true })
            const suffix = Math.random().toString(36).slice(2, 6)
            const { data: newLandlord } = await supabase
              .from('landlords')
              .insert({
                display_name: ownerName,
                slug: `${baseSlug}-${suffix}`,
                city: 'Phoenix',
                state: 'Arizona',
                state_abbr: 'AZ',
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
            city: 'Phoenix',
            state: 'Arizona',
            state_abbr: 'AZ',
            zip,
            address_normalized: addrNorm,
            landlord_id: landlordId,
            year_built: row.year_built ? parseInt(row.year_built) : null,
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
  'city of phoenix', 'maricopa county', 'phoenix housing authority',
  'state of arizona', 'united states', 'dept of', 'department of',
  'board of', 'federal', 'school district', 'unified school',
]

function isGovernmentOwner(name: string): boolean {
  const lower = name.toLowerCase()
  return GOV_KEYWORDS.some(kw => lower.includes(kw))
}
