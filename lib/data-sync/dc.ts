/**
 * Washington DC Housing & Building Violations
 * Portal: https://opendata.dc.gov (ArcGIS Hub)
 * DC migrated from Socrata to ArcGIS. Housing violations available via FeatureServer.
 * Set DC_ARCGIS_SERVICE env var to override.
 *
 * Known DC ArcGIS services:
 *   - Building Permits: DC GIS services
 *   - Housing violations: DCRA data
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveProperty, normalizeAddress, type SyncResult } from './utils'

const FEATURE_SERVICES = [
  process.env.DC_ARCGIS_SERVICE,
  // DC DCRA Housing violations
  'https://maps2.dcgis.dc.gov/dcgis/rest/services/DCRA/DCRA_Inspection_Violations/FeatureServer/0',
  // DC Building permits (fallback)
  'https://maps2.dcgis.dc.gov/dcgis/rest/services/DCRA/DCRA_Building_Permits/FeatureServer/0',
].filter(Boolean) as string[]

const PAGE_SIZE = 1000

export async function syncDC(supabase: SupabaseClient): Promise<SyncResult> {
  const result: SyncResult = { added: 0, updated: 0, skipped: 0, errors: [] }

  let workingService: string | null = null
  for (const svc of FEATURE_SERVICES) {
    try {
      const probe = await fetch(
        `${svc}/query?where=1%3D1&outFields=OBJECTID&f=json&resultRecordCount=1`,
        { signal: AbortSignal.timeout(8000) }
      )
      if (probe.ok) {
        const json = await probe.json()
        if (json.features !== undefined) { workingService = svc; break }
      }
    } catch { /* try next */ }
  }

  if (!workingService) {
    result.errors.push('No working DC ArcGIS endpoint found. Browse opendata.dc.gov for housing violation datasets, then set DC_ARCGIS_SERVICE env var.')
    return result
  }

  let offset = 0
  while (true) {
    const url = `${workingService}/query?where=1%3D1&outFields=*&f=json&resultRecordCount=${PAGE_SIZE}&resultOffset=${offset}&orderByFields=OBJECTID`
    let features: any[]
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
      if (!res.ok) { result.errors.push(`HTTP ${res.status} from DC API`); break }
      const json = await res.json()
      features = json.features ?? []
    } catch (e) {
      result.errors.push(e instanceof Error ? e.message : String(e)); break
    }
    if (features.length === 0) break

    for (const feat of features) {
      const row = feat.attributes ?? feat
      try {
        const sourceId = String(row.OBJECTID ?? row.PERMIT_NO ?? row.CASE_ID ?? row.VIOLATION_ID ?? '')
        if (!sourceId) { result.skipped++; continue }

        const addr = row.ADDRESS ?? row.FULL_ADDRESS ?? row.PREMISE_ADDRESS ?? row.SITE_ADDRESS ?? ''
        const addrNorm = normalizeAddress(addr)

        let propertyId = await resolveProperty(supabase, addrNorm, 'Washington', 'DC')
        if (!propertyId && addr) {
          const { data: newProp } = await supabase
            .from('properties')
            .insert({
              address_line1: addr,
              city: 'Washington',
              state: 'District of Columbia',
              state_abbr: 'DC',
              zip: row.ZIP ?? row.ZIPCODE ?? '',
              address_normalized: addrNorm,
            })
            .select('id').single()
          propertyId = newProp?.id ?? null
        }

        const filedTs = row.ISSUE_DATE ?? row.OPEN_DATE ?? row.VIOLATION_DATE ?? null
        const filedDate = filedTs
          ? (typeof filedTs === 'number'
              ? new Date(filedTs).toISOString().split('T')[0]
              : new Date(filedTs).toISOString().split('T')[0])
          : null

        const { error } = await supabase.from('public_records').upsert({
          source: 'dc_dcra',
          source_id: sourceId,
          record_type: 'dc_violation',
          property_id: propertyId,
          title: `DC: ${row.VIOLATION_TYPE ?? row.PERMIT_TYPE ?? row.CASE_TYPE ?? row.DESCRIPTION ?? 'Housing Violation'}`.slice(0, 150),
          description: row.DESCRIPTION ?? row.VIOLATION_TYPE ?? row.PERMIT_TYPE ?? null,
          severity: 'medium',
          status: mapStatus(row.STATUS ?? row.CASE_STATUS ?? row.PERMIT_STATUS),
          filed_date: filedDate,
          source_url: 'https://opendata.dc.gov',
          raw_data: row,
        }, { onConflict: 'source,source_id', ignoreDuplicates: false })

        if (error) { result.errors.push(error.message); continue }
        result.added++
      } catch (e) {
        result.errors.push(e instanceof Error ? e.message : String(e))
      }
    }

    offset += PAGE_SIZE
    if (features.length < PAGE_SIZE) break
  }

  return result
}

function mapStatus(val: string | null | undefined): string {
  if (!val) return 'open'
  const v = val.toLowerCase()
  if (v.includes('close') || v.includes('complet') || v.includes('final') || v.includes('issued')) return 'closed'
  if (v.includes('pend') || v.includes('review')) return 'pending'
  return 'open'
}
