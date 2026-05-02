/**
 * Philadelphia OPA (Office of Property Assessment) Ownership Data
 * Source: City of Philadelphia Open Data
 * API: https://data.phila.gov/resource/xt3q-t474.json (Socrata)
 * ~580k residential properties with owner names
 *
 * Primary source for linking Philadelphia properties to landlords.
 * Runs weekly (large dataset).
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeAddress, type SyncResult } from './utils'
import slugify from 'slugify'

// Primary: CARTO SQL API (reliable). Socrata mirror is at xt3q-t474 if needed.
const CARTO_BASE = 'https://phl.carto.com/api/v2/sql'
const PAGE_SIZE = 2000

export async function syncPhillyOpa(supabase: SupabaseClient): Promise<SyncResult> {
  const result: SyncResult = { added: 0, updated: 0, skipped: 0, errors: [] }

  let offset = 0
  const processedOwners = new Map<string, string>() // normalizedName → landlordId

  while (true) {
    // Use CARTO SQL API — filter to multifamily/apartment/mixed-use with owner names
    const sql = `SELECT parcel_number, location, zip_code, owner_1, owner_2, category_code_description, number_of_rooms, year_built FROM opa_properties_public WHERE owner_1 IS NOT NULL AND (category_code_description LIKE '%MULTI%' OR category_code_description LIKE '%APARTMENT%' OR category_code_description LIKE '%MIXED%' OR category_code_description LIKE '%CONDO%') ORDER BY parcel_number LIMIT ${PAGE_SIZE} OFFSET ${offset}`

    let rows: any[]
    try {
      const res = await fetch(`${CARTO_BASE}?q=${encodeURIComponent(sql)}`, { signal: AbortSignal.timeout(30000) })
      if (!res.ok) { result.errors.push(`HTTP ${res.status} from Philly CARTO`); break }
      const json = await res.json()
      rows = json.rows ?? []
      if (!Array.isArray(rows)) break
    } catch (e) {
      result.errors.push(e instanceof Error ? e.message : String(e)); break
    }
    if (rows.length === 0) break

    for (const row of rows) {
      try {
        // Prefer owner_2 if owner_1 looks like a company that owner_2 clarifies
        const rawOwner = row.owner_1?.trim() ?? ''
        if (!rawOwner) { result.skipped++; continue }

        const ownerName = cleanOwnerName(rawOwner)
        if (!ownerName || isGovernmentOwner(ownerName)) { result.skipped++; continue }

        const address = row.location?.trim() ?? ''
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
            .eq('state_abbr', 'PA')
            .limit(1)
            .single()

          if (existing) {
            landlordId = existing.id
          } else {
            const baseSlug = slugify(`${ownerName}-philadelphia`, { lower: true, strict: true })
            const suffix = Math.random().toString(36).slice(2, 6)
            const { data: newLandlord } = await supabase
              .from('landlords')
              .insert({
                display_name: ownerName,
                slug: `${baseSlug}-${suffix}`,
                city: 'Philadelphia',
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
            city: 'Philadelphia',
            state: 'Pennsylvania',
            state_abbr: 'PA',
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
  'city of philadelphia', 'philadelphia redevelopment', 'pha ', 'housing authority',
  'commonwealth of pennsylvania', 'united states', 'dept of', 'department of',
  'board of', 'school district', 'phila authority', 'federal',
]

function isGovernmentOwner(name: string): boolean {
  const lower = name.toLowerCase()
  return GOV_KEYWORDS.some(kw => lower.includes(kw))
}
