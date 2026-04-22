/**
 * NYC MapPLUTO — Property-Level Data with Owner Names
 * Source: NYC Department of City Planning
 * API: https://data.cityofnewyork.us/resource/64uk-42ks.json (Socrata)
 * ~900k NYC tax lots with address, owner name, building class, lot area
 *
 * This is the primary source for linking NYC properties to landlords.
 * Runs weekly (large dataset, ~900k records).
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeAddress, type SyncResult } from './utils'
import slugify from 'slugify'

// NYC MapPLUTO — all tax lots in NYC
const ENDPOINT = 'https://data.cityofnewyork.us/resource/64uk-42ks.json'
const PAGE_SIZE = 2000

// Owner types: I=individual, C=city/gov, M=mixed/other, O=other, R=residential
// We only want residential and mixed-use properties
const RESIDENTIAL_CLASSES = [
  'A', // 1-3 family residential
  'B', // 2-10 unit residential
  'C', // walk-up apartment
  'D', // elevator apartment
  'S', // mixed residential/commercial
]

export async function syncNycPluto(supabase: SupabaseClient): Promise<SyncResult> {
  const result: SyncResult = { added: 0, updated: 0, skipped: 0, errors: [] }

  // Filter: residential/multifamily only (exclude commercial, parking, vacant land)
  const classFilter = RESIDENTIAL_CLASSES.map(c => `bldgclass like '${c}%'`).join(' OR ')

  let offset = 0
  const processedOwners = new Map<string, string>() // normalizedName → landlordId

  while (true) {
    const u = new URL(ENDPOINT)
    u.searchParams.set('$where', `(${classFilter}) AND ownername IS NOT NULL AND address IS NOT NULL`)
    u.searchParams.set('$select', 'bbl,address,zipcode,ownername,bldgclass,unitsres,yearbuilt,borough')
    u.searchParams.set('$limit', String(PAGE_SIZE))
    u.searchParams.set('$offset', String(offset))
    u.searchParams.set('$order', 'bbl')

    let rows: any[]
    try {
      const res = await fetch(u.toString(), {
        headers: { 'X-App-Token': process.env.NYC_OPEN_DATA_TOKEN ?? '' },
        signal: AbortSignal.timeout(30000),
      })
      if (!res.ok) { result.errors.push(`HTTP ${res.status} from MapPLUTO`); break }
      rows = await res.json()
      if (!Array.isArray(rows)) break
    } catch (e) {
      result.errors.push(e instanceof Error ? e.message : String(e)); break
    }
    if (rows.length === 0) break

    for (const row of rows) {
      try {
        const ownerName = cleanOwnerName(row.ownername)
        if (!ownerName || isGovernmentOwner(ownerName)) { result.skipped++; continue }

        const address = row.address?.trim() ?? ''
        const zip = row.zipcode ?? ''
        const borough = row.borough ?? ''
        const city = boroughToCity(borough)
        const addrNorm = normalizeAddress(address)

        // Get or create landlord
        let landlordId = processedOwners.get(ownerName.toLowerCase())
        if (!landlordId) {
          // Check if already exists
          const { data: existing } = await supabase
            .from('landlords')
            .select('id')
            .ilike('display_name', ownerName)
            .eq('state_abbr', 'NY')
            .limit(1)
            .single()

          if (existing) {
            landlordId = existing.id
          } else {
            const baseSlug = slugify(ownerName + '-nyc', { lower: true, strict: true })
            const suffix = Math.random().toString(36).slice(2, 6)
            const { data: newLandlord } = await supabase
              .from('landlords')
              .insert({
                display_name: ownerName,
                slug: `${baseSlug}-${suffix}`,
                city: city || 'New York City',
                state: 'New York',
                state_abbr: 'NY',
                zip,
              })
              .select('id')
              .single()
            landlordId = newLandlord?.id ?? null
            if (landlordId) result.added++
          }
          if (landlordId) processedOwners.set(ownerName.toLowerCase(), landlordId)
        }

        // Upsert property linked to landlord
        if (landlordId && address) {
          await supabase.from('properties').upsert({
            address_line1: address,
            city: city || 'New York City',
            state: 'New York',
            state_abbr: 'NY',
            zip,
            address_normalized: addrNorm,
            landlord_id: landlordId,
            unit_count: row.unitsres ? parseInt(row.unitsres) : null,
            year_built: row.yearbuilt ? parseInt(row.yearbuilt) : null,
          }, { onConflict: 'address_normalized,city,state_abbr', ignoreDuplicates: false })
        }
      } catch (e) {
        result.errors.push(e instanceof Error ? e.message : String(e))
      }
    }

    offset += PAGE_SIZE
    if (rows.length < PAGE_SIZE) break
    // Cap at 200k per run (full dataset is 900k, run over multiple days)
    if (offset > 200000) break
  }

  return result
}

function boroughToCity(borough: string): string {
  const b = borough?.toUpperCase()
  if (b === 'MN') return 'Manhattan'
  if (b === 'BK') return 'Brooklyn'
  if (b === 'QN') return 'Queens'
  if (b === 'BX') return 'Bronx'
  if (b === 'SI') return 'Staten Island'
  return 'New York City'
}

function cleanOwnerName(raw: string): string | null {
  if (!raw) return null
  // Remove common artifacts
  const name = raw.trim()
    .replace(/\s+/g, ' ')
    .replace(/^[^A-Z0-9]/i, '')
    // Title-case if all caps
    .replace(/^[A-Z\s&.,'-]+$/, s => toTitleCase(s))

  if (name.length < 2 || name.length > 120) return null
  return name || null
}

function toTitleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase())
}

const GOV_KEYWORDS = [
  'city of new york', 'nyc', 'new york city', 'hpd', 'nycha',
  'new york state', 'united states', 'dept of', 'department of',
  'housing development', 'authority', 'public school',
]

function isGovernmentOwner(name: string): boolean {
  const lower = name.toLowerCase()
  return GOV_KEYWORDS.some(kw => lower.includes(kw))
}
