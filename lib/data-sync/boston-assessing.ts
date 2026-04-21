/**
 * Boston Property Assessment Ownership Data
 * Source: City of Boston Open Data
 * API: https://data.boston.gov/resource/yu93-tymg.json (Socrata)
 * ~170k properties with owner names
 *
 * Primary source for linking Boston properties to landlords.
 * Runs weekly.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeAddress, type SyncResult } from './utils'
import slugify from 'slugify'

const ENDPOINT = 'https://data.boston.gov/resource/yu93-tymg.json'
const PAGE_SIZE = 2000

export async function syncBostonAssessing(supabase: SupabaseClient): Promise<SyncResult> {
  const result: SyncResult = { added: 0, updated: 0, skipped: 0, errors: [] }

  let offset = 0
  const processedOwners = new Map<string, string>() // normalizedName → landlordId

  while (true) {
    // Filter for residential: LU (land use) starting with R or A (apartments)
    const url = `${ENDPOINT}?$where=owner IS NOT NULL AND (lu like 'R%' OR lu like 'A%' OR lu like 'CD' OR lu like 'CM')` +
      `&$select=pid,st_num,st_name,st_name_suf,unit_num,zipcode,owner,lu_desc,r_bldg_styl,yr_built,r_total_rms` +
      `&$limit=${PAGE_SIZE}&$offset=${offset}&$order=pid`

    let rows: any[]
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(30000) })
      if (!res.ok) {
        // Try without filter
        const fallback = await fetch(
          `${ENDPOINT}?$where=owner IS NOT NULL&$select=pid,st_num,st_name,st_name_suf,zipcode,owner,lu_desc,yr_built` +
          `&$limit=${PAGE_SIZE}&$offset=${offset}&$order=pid`,
          { signal: AbortSignal.timeout(30000) }
        )
        if (!fallback.ok) { result.errors.push(`HTTP ${fallback.status} from Boston Assessing`); break }
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
        const rawOwner = row.owner?.trim() ?? ''
        if (!rawOwner) { result.skipped++; continue }

        const ownerName = cleanOwnerName(rawOwner)
        if (!ownerName || isGovernmentOwner(ownerName)) { result.skipped++; continue }

        // Build address from parts
        const parts = [row.st_num, row.st_name, row.st_name_suf].filter(Boolean)
        const address = parts.join(' ').trim()
        if (!address) { result.skipped++; continue }

        const zip = row.zipcode ?? ''
        const addrNorm = normalizeAddress(address)
        const ownerKey = ownerName.toLowerCase()

        let landlordId = processedOwners.get(ownerKey)
        if (!landlordId) {
          const { data: existing } = await supabase
            .from('landlords')
            .select('id')
            .ilike('display_name', ownerName)
            .eq('state_abbr', 'MA')
            .limit(1)
            .single()

          if (existing) {
            landlordId = existing.id
          } else {
            const baseSlug = slugify(`${ownerName}-boston`, { lower: true, strict: true })
            const suffix = Math.random().toString(36).slice(2, 6)
            const { data: newLandlord } = await supabase
              .from('landlords')
              .insert({
                display_name: ownerName,
                slug: `${baseSlug}-${suffix}`,
                city: 'Boston',
                state: 'Massachusetts',
                state_abbr: 'MA',
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
            city: 'Boston',
            state: 'Massachusetts',
            state_abbr: 'MA',
            zip,
            address_normalized: addrNorm,
            landlord_id: landlordId,
            year_built: row.yr_built ? parseInt(row.yr_built) : null,
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
  'city of boston', 'boston housing authority', 'bha', 'commonwealth of',
  'state of massachusetts', 'united states', 'dept of', 'department of',
  'board of', 'mbta', 'massport', 'federal', 'secretary of',
]

function isGovernmentOwner(name: string): boolean {
  const lower = name.toLowerCase()
  return GOV_KEYWORDS.some(kw => lower.includes(kw))
}
