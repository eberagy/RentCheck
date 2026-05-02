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
import type { SyncResult } from './utils'
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

  // Assessor + ownership-only sources — most have a clean owner column.
  cook_county_assessor:    ['owner_name', 'mail_owner_name', 'taxpayer_name', 'taxpayer'],
  philly_opa:              ['owner_1', 'owner_2', 'mailing_care_of'],
  boston_assessing:        ['owner', 'mail_address', 'mailing_address'],
  la_rso:                  ['property_owner', 'owner_name', 'last_name'],
  dc_assessor:             ['ownername', 'owner_name', 'owner1', 'owner2'],
  miami_dade_assessor:     ['true_owner1', 'owner1', 'owner2', 'owner_name'],
  denver_assessor:         ['owner', 'owner_name', 'taxpayer'],
  harris_county_assessor:  ['owner_name', 'mailing_owner', 'taxpayer'],
  maricopa_assessor:       ['owner', 'owner_name', 'mailaddress'],
  king_county_assessor:    ['owner_name', 'taxpayer_name', 'mailaddress'],
  sf_assessor:             ['owner', 'owner_name', 'mailowner'],
  allegheny_assessor:      ['owner_name', 'owner', 'taxpayer_name'],
  la_county_assessor:      ['owner_name', 'mailaddress', 'taxpayer_name'],
  cuyahoga_assessor:       ['owner_name', 'taxpayer_name', 'mail_address'],
  wake_county_assessor:    ['owner_name', 'name', 'taxpayer'],
  franklin_county_assessor:['owner_name', 'taxpayer', 'owner'],
  mecklenburg_assessor:    ['owner_name', 'taxpayer', 'mail_address'],
  travis_county_assessor:  ['owner_name', 'taxpayer', 'mailaddress'],

  // HUD multifamily includes management agents alongside the owner.
  hud_multifamily:         ['owner', 'owner_name', 'managing_agent', 'mgmt_agent'],
  hud_reac:                ['owner_organization_name', 'owner', 'managing_agent'],

  // NYC PLUTO (rich landlord-side metadata)
  nyc_pluto:               ['ownername', 'owner_name'],

  // Catchall for any source not listed above
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

  // Assessors + national ownership sources
  philly_opa:              { state: 'Pennsylvania', stateAbbr: 'PA' },
  boston_assessing:        { state: 'Massachusetts', stateAbbr: 'MA' },
  la_rso:                  { state: 'California', stateAbbr: 'CA' },
  dc_assessor:             { state: 'District of Columbia', stateAbbr: 'DC' },
  miami_dade_assessor:     { state: 'Florida', stateAbbr: 'FL' },
  denver_assessor:         { state: 'Colorado', stateAbbr: 'CO' },
  harris_county_assessor:  { state: 'Texas', stateAbbr: 'TX' },
  maricopa_assessor:       { state: 'Arizona', stateAbbr: 'AZ' },
  king_county_assessor:    { state: 'Washington', stateAbbr: 'WA' },
  sf_assessor:             { state: 'California', stateAbbr: 'CA' },
  allegheny_assessor:      { state: 'Pennsylvania', stateAbbr: 'PA' },
  la_county_assessor:      { state: 'California', stateAbbr: 'CA' },
  cuyahoga_assessor:       { state: 'Ohio', stateAbbr: 'OH' },
  wake_county_assessor:    { state: 'North Carolina', stateAbbr: 'NC' },
  franklin_county_assessor:{ state: 'Ohio', stateAbbr: 'OH' },
  mecklenburg_assessor:    { state: 'North Carolina', stateAbbr: 'NC' },
  travis_county_assessor:  { state: 'Texas', stateAbbr: 'TX' },
  // HUD is multi-state — fall back to row-level state when extracting; default unused.
}

// Two-stage keyset pagination so this stays inside Postgres'
// statement_timeout even as public_records crosses 400k rows.
// Page through unlinked PROPERTIES first, then fetch a record per
// property — skipping properties that already have a landlord and
// avoiding the OFFSET scan that was timing out previously.
const PROPERTY_PAGE_SIZE = 300
const MAX_PROPERTY_PAGES = 200 // 60k properties per run

export async function syncMineViolationOwners(supabase: SupabaseClient): Promise<SyncResult> {
  const result: SyncResult = { added: 0, updated: 0, skipped: 0, errors: [] }

  const processedOwners = new Map<string, string>() // `${ownerKey}|${stateAbbr}` → landlordId
  let pagesProcessed = 0
  let lastPropertyId = '00000000-0000-0000-0000-000000000000' // keyset cursor

  while (pagesProcessed < MAX_PROPERTY_PAGES) {
    // Stage 1: get the next page of unlinked properties via keyset cursor.
    const { data: properties, error: propErr } = await supabase
      .from('properties')
      .select('id, city, state_abbr, address_line1')
      .is('landlord_id', null)
      .gt('id', lastPropertyId)
      .order('id', { ascending: true })
      .limit(PROPERTY_PAGE_SIZE)

    if (propErr) { result.errors.push(propErr.message); break }
    if (!properties || properties.length === 0) break

    const propertyIds = properties.map(p => p.id)
    lastPropertyId = properties[properties.length - 1]!.id

    // Stage 2: pull one record per property with a usable raw_data + source.
    // We don't need every record for the property — just one with owner info.
    const { data: records, error: recErr } = await supabase
      .from('public_records')
      .select('id, property_id, source, raw_data')
      .in('property_id', propertyIds)
      .not('raw_data', 'is', null)
      .order('property_id, id', { ascending: true })

    if (recErr) { result.errors.push(recErr.message); break }

    // Group by property_id, take the first record per property
    const recordByProperty = new Map<string, { source: string; raw_data: Record<string, any> }>()
    for (const r of records ?? []) {
      const pid = r.property_id as string
      if (!pid || recordByProperty.has(pid)) continue
      recordByProperty.set(pid, { source: r.source as string, raw_data: r.raw_data as Record<string, any> })
    }

    // Build a unified iterable that mirrors the old `unlinked` shape
    const unlinked = properties
      .map(p => {
        const rec = recordByProperty.get(p.id)
        if (!rec) return null
        return {
          source: rec.source,
          raw_data: rec.raw_data,
          properties: { id: p.id, city: p.city, state_abbr: p.state_abbr, address_line1: p.address_line1, landlord_id: null as string | null },
        }
      })
      .filter(Boolean) as Array<{ source: string; raw_data: Record<string, any>; properties: { id: string; city: string | null; state_abbr: string | null; address_line1: string | null; landlord_id: string | null } }>

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

    pagesProcessed++
    if (properties.length < PROPERTY_PAGE_SIZE) break
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
  const name = raw.trim()
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
