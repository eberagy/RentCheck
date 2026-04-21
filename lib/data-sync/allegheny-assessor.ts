/**
 * Allegheny County (Pittsburgh) Property Assessment
 * Source: Western Pennsylvania Regional Data Center (WPRDC)
 * API: https://data.wprdc.org/resource/p6d2-3s3y.json (Socrata/CKAN)
 * ~600k parcels with owner names, property class, municipality
 *
 * Covers Pittsburgh + all Allegheny County municipalities.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeAddress, type SyncResult } from './utils'
import slugify from 'slugify'

const KNOWN_IDS = [
  process.env.ALLEGHENY_DATASET,
  'p6d2-3s3y',  // Allegheny County Property Assessments (WPRDC)
  'j4b2-s8xs',  // Allegheny County alt
].filter(Boolean) as string[]

const DOMAIN = 'data.wprdc.org'
const PAGE_SIZE = 2000

async function findWorkingEndpoint(): Promise<string | null> {
  for (const id of KNOWN_IDS) {
    const ep = `https://${DOMAIN}/resource/${id}.json`
    try {
      const res = await fetch(`${ep}?$limit=1`, { signal: AbortSignal.timeout(10000) })
      if (res.ok) {
        const rows = await res.json()
        if (Array.isArray(rows) && rows.length > 0) return ep
      }
    } catch { /* try next */ }
  }
  return null
}

export async function syncAlleghenyAssessor(supabase: SupabaseClient): Promise<SyncResult> {
  const result: SyncResult = { added: 0, updated: 0, skipped: 0, errors: [] }

  const endpoint = await findWorkingEndpoint()
  if (!endpoint) {
    result.errors.push('No working Allegheny County assessor endpoint. Set ALLEGHENY_DATASET env var from data.wprdc.org.')
    return result
  }

  let offset = 0
  const processedOwners = new Map<string, string>()

  while (true) {
    const url = `${endpoint}?$where=OWNERDESC IS NOT NULL` +
      `&$select=PARID,PROPERTYHOUSENUM,PROPERTYADDRESS,PROPERTYZIP,MUNIDESC,OWNERDESC,CLASSDESC,STYLEDESC,YEARBLT,UNITCOUNT` +
      `&$limit=${PAGE_SIZE}&$offset=${offset}&$order=PARID`

    let rows: any[]
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(30000) })
      if (!res.ok) {
        // Try without filter
        const fallback = await fetch(`${endpoint}?$limit=${PAGE_SIZE}&$offset=${offset}&$order=:id`, { signal: AbortSignal.timeout(30000) })
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
        const rawOwner = row.OWNERDESC ?? row.ownerdesc ?? row.owner_name ?? ''
        if (!rawOwner?.trim()) { result.skipped++; continue }

        const ownerName = cleanOwnerName(rawOwner.trim())
        if (!ownerName || isGovernmentOwner(ownerName)) { result.skipped++; continue }

        const houseNum = row.PROPERTYHOUSENUM ?? row.propertyhousenum ?? ''
        const streetAddr = row.PROPERTYADDRESS ?? row.propertyaddress ?? ''
        const address = [houseNum, streetAddr].filter(Boolean).join(' ').trim()
        if (!address) { result.skipped++; continue }

        const zip = row.PROPERTYZIP ?? row.propertyzip ?? ''
        const muni = row.MUNIDESC ?? row.munidesc ?? 'Pittsburgh'
        const city = muni.trim() || 'Pittsburgh'
        const addrNorm = normalizeAddress(address)
        const ownerKey = ownerName.toLowerCase()

        let landlordId = processedOwners.get(ownerKey)
        if (!landlordId) {
          const { data: existing } = await supabase
            .from('landlords')
            .select('id')
            .ilike('display_name', ownerName)
            .eq('state_abbr', 'PA')
            .limit(1)
            .single()

          if (existing) {
            landlordId = existing.id
          } else {
            const baseSlug = slugify(`${ownerName}-pittsburgh`, { lower: true, strict: true })
            const suffix = Math.random().toString(36).slice(2, 6)
            const { data: newLandlord } = await supabase
              .from('landlords')
              .insert({
                display_name: ownerName,
                slug: `${baseSlug}-${suffix}`,
                city: 'Pittsburgh',
                state: 'Pennsylvania',
                state_abbr: 'PA',
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
            city,
            state: 'Pennsylvania',
            state_abbr: 'PA',
            zip,
            address_normalized: addrNorm,
            landlord_id: landlordId,
            year_built: row.YEARBLT ?? row.yearblt ? parseInt(row.YEARBLT ?? row.yearblt) : null,
            unit_count: row.UNITCOUNT ?? row.unitcount ?? null,
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
  'allegheny county', 'city of pittsburgh', 'pittsburgh housing authority',
  'state of pennsylvania', 'united states', 'dept of', 'department of',
  'board of', 'federal', 'school district', 'municipality of',
]

function isGovernmentOwner(name: string): boolean {
  const lower = name.toLowerCase()
  return GOV_KEYWORDS.some(kw => lower.includes(kw))
}
