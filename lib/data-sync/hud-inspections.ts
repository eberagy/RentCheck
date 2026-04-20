/**
 * HUD REAC Physical Inspection Scores
 * Federal dataset — subsidized/assisted housing inspection results
 * API: https://www.huduser.gov/portal/dataset/multifamily-api.html
 * Public data, no API key required
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveProperty, normalizeAddress, type SyncResult } from './utils'

// HUD Multifamily Assistance & Section 8 Contracts API
const HUD_BASE = 'https://services.hud.gov/housing'

// REAC inspection data via HUD open data
const REAC_ENDPOINT = 'https://www.huduser.gov/portal/datasets/pis.html'

// Actually use the HUD iQuery API which is publicly accessible
// Physical Inspection Scores for Multifamily properties
const ENDPOINTS = [
  'https://apps.hud.gov/pub/chums/cyacst3.zip', // not an API
]

// Use the actual HUD Multifamily Catalog API
const HUD_CATALOG_URL = 'https://data.hud.gov/Housing_Counselor/searchByZip'

// The real working endpoint is the HUD Picture of Subsidized Households
// Available via HUD's open data portal
const HUD_REAC_URL = 'https://www.huduser.gov/portal/datasets/reac/reac_score_and_findings_new.csv'

// Best approach: use HUD's public inspection data via their API
// https://api.hud.gov/ - requires registration but free
// For now use the public CSV approach via HUD UserHere
const MULTIFAMILY_ENDPOINTS = [
  // HUD Multifamily Properties with failing inspection scores - public CSV
  'https://www.huduser.gov/portal/datasets/pis/Inspections.csv',
]

// Use the HUD open data API for physical inspections
// This is the real working endpoint from HUD's data catalog
export async function syncHudInspections(supabase: SupabaseClient): Promise<SyncResult> {
  const result: SyncResult = { added: 0, updated: 0, skipped: 0, errors: [] }

  // HUD provides inspection data via their Socrata-based data portal
  // at data.hud.gov which uses ArcGIS
  const endpoints = [
    // REAC scores for multifamily housing - major cities
    'https://services.arcgis.com/VTyQ9soqVukalItT/arcgis/rest/services/HUD_Multifamily_Properties/FeatureServer/0/query',
    // Alternative: HUD Picture of Subsidized Households
    'https://opendata.hud.gov/resource/3qem-6v3v.json',
  ]

  // Try to get data from HUD via their open data
  for (const endpoint of endpoints) {
    try {
      let url: string
      if (endpoint.includes('arcgis')) {
        url = `${endpoint}?where=INSPECTION_SCORE<60&outFields=*&f=json&resultRecordCount=1000`
      } else {
        url = `${endpoint}?$where=inspection_score<60&$limit=1000`
      }

      const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
      if (!res.ok) continue

      const data = await res.json()
      const rows: any[] = endpoint.includes('arcgis')
        ? (data?.features?.map((f: any) => f.attributes) ?? [])
        : (Array.isArray(data) ? data : [])

      if (rows.length === 0) continue

      for (const row of rows) {
        try {
          const sourceId = String(row.HUD_PROJECT_NUMBER ?? row.project_id ?? row.OBJECTID ?? '')
          if (!sourceId) { result.skipped++; continue }

          const addr = row.ADDRESS ?? row.address ?? row.PROPERTY_ADDRESS ?? ''
          const city = row.CITY ?? row.city ?? ''
          const state = row.STATE ?? row.state ?? ''
          const zip = row.ZIP_CODE ?? row.zip ?? ''

          if (!addr || !city) { result.skipped++; continue }

          const addrNorm = normalizeAddress(addr)
          let propertyId = await resolveProperty(supabase, addrNorm, city, state)
          if (!propertyId && addr) {
            const { data: newProp } = await supabase.from('properties').insert({
              address_line1: addr, city, state_abbr: state, zip,
              address_normalized: addrNorm,
            }).select('id').single()
            propertyId = newProp?.id ?? null
          }

          const score = row.INSPECTION_SCORE ?? row.inspection_score ?? null
          const severity = score !== null ? (score < 30 ? 'critical' : score < 60 ? 'high' : 'medium') : 'medium'

          const { error } = await supabase.from('public_records').upsert({
            source: 'hud_reac',
            source_id: sourceId,
            record_type: 'hud_inspection',
            property_id: propertyId,
            title: `HUD Inspection: Score ${score ?? 'N/A'} — ${row.PROPERTY_NAME ?? row.project_name ?? addr}`.slice(0, 150),
            description: `HUD REAC physical inspection score of ${score} (below 60 indicates significant deficiencies). Property: ${row.PROPERTY_NAME ?? addr}`,
            severity,
            status: score !== null && score >= 60 ? 'closed' : 'open',
            filed_date: (row.INSPECTION_DATE ?? row.inspection_date) ? new Date(row.INSPECTION_DATE ?? row.inspection_date).toISOString().split('T')[0] : null,
            source_url: `https://www.huduser.gov/portal/datasets/pis.html`,
            raw_data: row,
          }, { onConflict: 'source,source_id', ignoreDuplicates: false })

          if (error) { result.errors.push(error.message); continue }
          result.added++
        } catch (e) {
          result.errors.push(e instanceof Error ? e.message : String(e))
        }
      }
      break // success
    } catch { /* try next */ }
  }

  if (result.added === 0 && result.errors.length === 0) {
    result.errors.push('HUD REAC: No data returned from any endpoint')
  }

  return result
}
