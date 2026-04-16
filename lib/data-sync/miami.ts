/**
 * Miami-Dade County Code Violations & Building Complaints
 * Portal: https://opendata.miamidade.gov (ArcGIS Hub)
 * Miami-Dade migrated from Socrata to ArcGIS. We query via ArcGIS Feature Service REST API.
 * Datasets:
 *   - Code violations: available via Miami-Dade ArcGIS Hub
 *   - Building complaints: Miami-Dade PROS system
 *
 * Set MIAMI_ARCGIS_SERVICE env var to override the feature service URL.
 * Default tries the Miami-Dade building violations feature service.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveProperty, normalizeAddress, type SyncResult } from './utils'

// Miami-Dade ArcGIS Feature Service for code violations
const FEATURE_SERVICES = [
  process.env.MIAMI_ARCGIS_SERVICE,
  // Miami-Dade County Code Violations (ArcGIS Hub)
  'https://gis.miamidade.gov/arcgis/rest/services/MD_OpenData/MD_CodeCompliance/FeatureServer/0',
  // City of Miami code enforcement (alternate)
  'https://services.arcgis.com/8Pc9XBTAsYuxx9Ny/arcgis/rest/services/Code_Enforcement/FeatureServer/0',
].filter(Boolean) as string[]

const PAGE_SIZE = 1000

export async function syncMiami(supabase: SupabaseClient): Promise<SyncResult> {
  const result: SyncResult = { added: 0, updated: 0, skipped: 0, errors: [] }
  const since = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).getTime()

  let workingService: string | null = null
  for (const svc of FEATURE_SERVICES) {
    try {
      const probe = await fetch(
        `${svc}/query?where=1%3D1&outFields=*&f=json&resultRecordCount=1`,
        { signal: AbortSignal.timeout(8000) }
      )
      if (probe.ok) {
        const json = await probe.json()
        if (json.features || json.error === undefined) { workingService = svc; break }
      }
    } catch { /* try next */ }
  }

  if (!workingService) {
    result.errors.push('No working Miami-Dade ArcGIS endpoint found. Set MIAMI_ARCGIS_SERVICE with a valid ArcGIS Feature Service URL.')
    return result
  }

  let offset = 0
  while (true) {
    const url = `${workingService}/query?where=1%3D1&outFields=*&f=json&resultRecordCount=${PAGE_SIZE}&resultOffset=${offset}&orderByFields=OBJECTID`
    let features: any[]
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
      if (!res.ok) { result.errors.push(`HTTP ${res.status} from Miami API`); break }
      const json = await res.json()
      features = json.features ?? []
    } catch (e) {
      result.errors.push(e instanceof Error ? e.message : String(e)); break
    }
    if (features.length === 0) break

    for (const feat of features) {
      const row = feat.attributes ?? feat
      try {
        const sourceId = String(row.OBJECTID ?? row.CASE_NUMBER ?? row.CASE_NO ?? row.CaseNumber ?? '')
        if (!sourceId) { result.skipped++; continue }

        const addr = row.ADDRESS ?? row.PROPERTY_ADDRESS ?? row.Site_Address ?? ''
        const addrNorm = normalizeAddress(addr)

        let propertyId = await resolveProperty(supabase, addrNorm, 'Miami', 'FL')
        if (!propertyId && addr) {
          const { data: newProp } = await supabase
            .from('properties')
            .insert({
              address_line1: addr,
              city: 'Miami',
              state: 'Florida',
              state_abbr: 'FL',
              zip: row.ZIP ?? row.ZIP_CODE ?? '',
              address_normalized: addrNorm,
            })
            .select('id').single()
          propertyId = newProp?.id ?? null
        }

        const filedTs = row.DATE_OPENED ?? row.OPEN_DATE ?? row.CASE_DATE ?? null
        const filedDate = filedTs
          ? (typeof filedTs === 'number'
              ? new Date(filedTs).toISOString().split('T')[0]
              : new Date(filedTs).toISOString().split('T')[0])
          : null

        const { error } = await supabase.from('public_records').upsert({
          source: 'miami_dade',
          source_id: sourceId,
          record_type: 'miami_violation',
          property_id: propertyId,
          title: `Miami-Dade Code Violation: ${row.VIOLATION_TYPE ?? row.CASE_TYPE ?? row.Description ?? 'Code Violation'}`.slice(0, 150),
          description: row.VIOLATION_DESCRIPTION ?? row.VIOLATION_TYPE ?? row.CASE_TYPE ?? null,
          severity: 'medium',
          status: mapStatus(row.STATUS ?? row.CASE_STATUS),
          filed_date: filedDate,
          source_url: 'https://opendata.miamidade.gov',
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
  if (v.includes('close') || v.includes('complet') || v.includes('resolv')) return 'closed'
  if (v.includes('pend')) return 'pending'
  return 'open'
}
