/**
 * Denver Code Enforcement Cases
 * Portal: https://www.denvergov.org/opendata (ArcGIS Hub)
 * Denver uses ArcGIS-based open data. Code enforcement cases are available
 * via the Denver GIS services portal.
 * Set DENVER_ARCGIS_SERVICE env var to override.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveProperty, normalizeAddress, type SyncResult } from './utils'

const FEATURE_SERVICES = [
  process.env.DENVER_ARCGIS_SERVICE,
  // Denver Code Enforcement Cases
  'https://services1.arcgis.com/zdB7qR0BtYrg0Xpl/arcgis/rest/services/code_enforcement_cases/FeatureServer/0',
  // Denver Building Permits (fallback)
  'https://services1.arcgis.com/zdB7qR0BtYrg0Xpl/arcgis/rest/services/building_permits/FeatureServer/0',
].filter(Boolean) as string[]

const PAGE_SIZE = 1000

export async function syncDenver(supabase: SupabaseClient): Promise<SyncResult> {
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
    result.errors.push('No working Denver ArcGIS endpoint found. Set DENVER_ARCGIS_SERVICE env var with a valid FeatureServer URL from denvergov.org/opendata.')
    return result
  }

  let offset = 0
  while (true) {
    const url = `${workingService}/query?where=1%3D1&outFields=*&f=json&resultRecordCount=${PAGE_SIZE}&resultOffset=${offset}&orderByFields=OBJECTID`
    let features: any[]
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
      if (!res.ok) { result.errors.push(`HTTP ${res.status} from Denver API`); break }
      const json = await res.json()
      features = json.features ?? []
    } catch (e) {
      result.errors.push(e instanceof Error ? e.message : String(e)); break
    }
    if (features.length === 0) break

    for (const feat of features) {
      const row = feat.attributes ?? feat
      try {
        const sourceId = String(row.OBJECTID ?? row.CASE_NUMBER ?? row.PERMIT_NO ?? '')
        if (!sourceId) { result.skipped++; continue }

        const addr = row.ADDRESS ?? row.SITE_ADDRESS ?? row.PROPERTY_ADDRESS ?? ''
        const addrNorm = normalizeAddress(addr)

        let propertyId = await resolveProperty(supabase, addrNorm, 'Denver', 'CO')
        if (!propertyId && addr) {
          const { data: newProp } = await supabase
            .from('properties')
            .insert({
              address_line1: addr,
              city: 'Denver',
              state: 'Colorado',
              state_abbr: 'CO',
              zip: row.ZIP ?? row.ZIP_CODE ?? '',
              address_normalized: addrNorm,
            })
            .select('id').single()
          propertyId = newProp?.id ?? null
        }

        const filedTs = row.DATE_OPENED ?? row.OPEN_DATE ?? row.PERMIT_DATE ?? null
        const filedDate = filedTs
          ? (typeof filedTs === 'number'
              ? new Date(filedTs).toISOString().split('T')[0]
              : new Date(filedTs).toISOString().split('T')[0])
          : null

        const { error } = await supabase.from('public_records').upsert({
          source: 'denver_code',
          source_id: sourceId,
          record_type: 'denver_violation',
          property_id: propertyId,
          title: `Denver: ${row.CASE_TYPE ?? row.VIOLATION_TYPE ?? row.PERMIT_TYPE ?? 'Code Case'}`.slice(0, 150),
          description: row.DESCRIPTION ?? row.CASE_TYPE ?? row.VIOLATION_TYPE ?? null,
          severity: 'medium',
          status: mapStatus(row.STATUS ?? row.CASE_STATUS),
          filed_date: filedDate,
          source_url: 'https://www.denvergov.org/opendata',
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
  if (v.includes('close') || v.includes('complet') || v.includes('final')) return 'closed'
  if (v.includes('pend')) return 'pending'
  return 'open'
}
