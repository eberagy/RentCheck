/**
 * Mine Owner Names from Existing Violation Records
 *
 * We already have 50k+ public_records with raw_data from NYC HPD, SF, Philly, LA, etc.
 * Many of those records embed owner/landlord names in their raw_data JSONB field.
 *
 * This sync:
 * 1. Reads public_records that have a property_id but no landlord_id on the property
 * 2. Extracts owner names from raw_data using known field names per source
 * 3. Creates/finds the landlord
 * 4. Updates the property's landlord_id
 *
 * Run weekly — picks up newly imported violation records and back-fills linkages.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeAddress, type SyncResult } from './utils'
import slugify from 'slugify'

// Known owner field names in raw_data by source prefix
const OWNER_FIELDS_BY_SOURCE: Record<string, string[]> = {
  nyc_hpd:          ['ownername', 'owner_name'],
  nyc_dob:          ['owner_name', 'applicant_business_name', 'owner_business_name'],
  nyc_311:          ['owner_name', 'agency'],
  philly_li:        ['ownername', 'owner_name', 'applicantname'],
  sf_housing:       ['owner_name', 'responsible_party', 'primary_appellant'],
  la_lahd:          ['owner_name', 'respondent_name', 'property_owner'],
  chicago_buildings:['owner_name', 'property_owner', 'complainant_name'],
  boston_isd:       ['owner', 'owner_name', 'responsible_party'],
  austin_code:      ['owner_name', 'applicant_name'],
  seattle_sdci:     ['owner_name', 'respondent_name'],
  dallas_code:      ['owner_name', 'service_request_creator'],
  houston_code:     ['owner_name', 'taxpayer'],
  miami_dade:       ['owner_name', 'complainant', 'owner1'],
  denver_code:      ['owner_name', 'owner', 'taxpayer'],
  dc_dcra:          ['owner_name', 'ownername', 'respondent_name'],
  atlanta_permits:  ['owner_name', 'applicant_name', 'contractor_name'],
  nashville_code:   ['owner_name', 'complainant_name'],
  // Catchall for any source
  default:          ['owner_name', 'ownername', 'property_owner', 'taxpayer_name',
                     'taxpayer', 'owner', 'respondent_name', 'managing_agent',
                     'landlord_name', 'registered_owner', 'head_officer'],
}

const STATE_FROM_SOURCE: Record<string, { state: string; stateAbbr: string }> = {
  nyc_hpd:          { state: 'New York', stateAbbr: 'NY' },
  nyc_dob:          { state: 'New York', stateAbbr: 'NY' },
  nyc_311:          { state: 'New York', stateAbbr: 'NY' },
  nyc_registration: { state: 'New York', stateAbbr: 'NY' },
  nyc_pluto:        { state: 'New York', stateAbbr: 'NY' },
  philly_li:        { state: 'Pennsylvania', stateAbbr: 'PA' },
  sf_housing:       { state: 'California', stateAbbr: 'CA' },
  la_lahd:          { state: 'California', stateAbbr: 'CA' },
  chicago_buildings:{ state: 'Illinois', stateAbbr: 'IL' },
  cook_county_assessor: { state: 'Illinois', stateAbbr: 'IL' },
  boston_isd:       { state: 'Massachusetts', stateAbbr: 'MA' },
  austin_code:      { state: 'Texas', stateAbbr: 'TX' },
  seattle_sdci:     { state: 'Washington', stateAbbr: 'WA' },
  dallas_code:      { state: 'Texas', stateAbbr: 'TX' },
  houston_code:     { state: 'Texas', stateAbbr: 'TX' },
  miami_dade:       { state: 'Florida', stateAbbr: 'FL' },
  denver_code:      { state: 'Colorado', stateAbbr: 'CO' },
  dc_dcra:          { state: 'District of Columbia', stateAbbr: 'DC' },
  atlanta_permits:  { state: 'Georgia', stateAbbr: 'GA' },
  nashville_code:   { state: 'Tennessee', stateAbbr: 'TN' },
  pittsburgh_pli:   { state: 'Pennsylvania', stateAbbr: 'PA' },
  baltimore_vacants:{ state: 'Maryland', stateAbbr: 'MD' },
}

const PAGE_SIZE = 500
const MAX_PAGES = 200 // 100k records per run max

export async function syncMineViolationOwners(supabase: SupabaseClient): Promise<SyncResult> {
  const result: SyncResult = { added: 0, updated: 0, skipped: 0, errors: [] }

  const processedOwners = new Map<string, string>() // `${ownerKey}|${stateAbbr}` → landlordId
  let pagesProcessed = 0
  let offset = 0

  while (pagesProcessed < MAX_PAGES) {
    // Fetch public_records that have property_id, with property join to check landlord_id
    const { data: records, error } = await supabase
      .from('public_records')
      .select(`
        property_id,
        source,
        raw_data,
        properties:property_id (id, landlord_id, city, state_abbr, address_line1)
      `)
      .not('property_id', 'is', null)
      .not('raw_data', 'is', null)
      .range(offset, offset + PAGE_SIZE - 1)

    if (error) { result.errors.push(error.message); break }
    if (!records || records.length === 0) break

    // Filter to only records where property has no landlord yet
    const unlinked = (records as any[]).filter(r => r.properties && !r.properties.landlord_id)

    for (const rec of unlinked) {
      try {
        const rawData = rec.raw_data as Record<string, any>
        if (!rawData) { result.skipped++; continue }

        const ownerName = extractOwnerName(rawData, rec.source)
        if (!ownerName) { result.skipped++; continue }

        const prop = rec.properties as any
        const city = prop.city ?? ''
        const stateAbbr = prop.state_abbr ?? (STATE_FROM_SOURCE[rec.source]?.stateAbbr ?? 'US')
        const stateFull = STATE_FROM_SOURCE[rec.source]?.state ?? stateAbbr

        const ownerCacheKey = `${ownerName.toLowerCase()}|${stateAbbr}`
        let landlordId = processedOwners.get(ownerCacheKey)

        if (!landlordId) {
          const { data: existing } = await supabase
            .from('landlords')
            .select('id')
            .ilike('display_name', ownerName)
            .eq('state_abbr', stateAbbr)
            .limit(1)
            .single()

          if (existing) {
            landlordId = existing.id
          } else {
            const citySlug = city?.toLowerCase().replace(/\s+/g, '-') || stateAbbr.toLowerCase()
            const baseSlug = slugify(`${ownerName}-${citySlug}`, { lower: true, strict: true })
            const suffix = Math.random().toString(36).slice(2, 6)
            const { data: newLandlord } = await supabase
              .from('landlords')
              .insert({
                display_name: ownerName,
                slug: `${baseSlug}-${suffix}`,
                city: city || '',
                state: stateFull,
                state_abbr: stateAbbr,
              })
              .select('id')
              .single()
            landlordId = newLandlord?.id ?? null
            if (landlordId) result.added++
          }
          if (landlordId) processedOwners.set(ownerCacheKey, landlordId)
        }

        if (landlordId && prop.id) {
          const { error: updateErr } = await supabase
            .from('properties')
            .update({ landlord_id: landlordId })
            .eq('id', prop.id)
            .is('landlord_id', null) // Only update if still unset (race condition safety)
          if (!updateErr) result.updated++
        }
      } catch (e) {
        result.errors.push(e instanceof Error ? e.message : String(e))
      }
    }

    offset += PAGE_SIZE
    pagesProcessed++
    if (records.length < PAGE_SIZE) break
  }

  return result
}

/** Extract best owner name from raw_data given the source */
function extractOwnerName(raw: Record<string, any>, source: string): string | null {
  const sourceFields: string[] = OWNER_FIELDS_BY_SOURCE[source] ?? []
  const defaultFields: string[] = OWNER_FIELDS_BY_SOURCE.default ?? []
  const fields = [...sourceFields, ...defaultFields]

  for (const field of fields) {
    const val = raw[field]
    if (val && typeof val === 'string' && val.trim().length > 1) {
      const cleaned = cleanOwnerName(val.trim())
      if (cleaned && !isGovernmentOwner(cleaned)) return cleaned
    }
  }
  return null
}

function cleanOwnerName(raw: string): string | null {
  if (!raw) return null
  let name = raw.trim()
    .replace(/\s+/g, ' ')
    .replace(/^[A-Z\s&.,'-]+$/, (s: string) => toTitleCase(s))
  // Skip clearly non-name values (phone numbers, dates, codes)
  if (/^\d{3}-\d{4}/.test(name)) return null
  if (name.length < 2 || name.length > 120) return null
  return name || null
}

function toTitleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase())
}

const GOV_KEYWORDS = [
  'city of', 'county of', 'state of', 'united states', 'dept of', 'department of',
  'housing authority', 'board of', 'federal', 'school district', 'public school',
  'nycha', 'hpd', 'dcra', 'lahd', 'authority',
]

function isGovernmentOwner(name: string): boolean {
  const lower = name.toLowerCase()
  return GOV_KEYWORDS.some(kw => lower.includes(kw))
}
