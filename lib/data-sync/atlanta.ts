/**
 * Atlanta Building Permits & Code Violations
 * Portal: https://opendata.atlantaregional.com (ArcGIS Hub)
 * Dataset: Atlanta Regional Building Permits (Accela database, 2019-present)
 * ArcGIS Feature Service UUID: 655f985f43cc40b4bf2ab7bc73d2169b
 * Set ATLANTA_ARCGIS_SERVICE env var to override.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveProperty, normalizeAddress, type SyncResult } from './utils'

const FEATURE_SERVICES = [
  process.env.ATLANTA_ARCGIS_SERVICE,
  // Atlanta Regional Building Permits (verified dataset ID from research)
  'https://services1.arcgis.com/Ug5xGQbHsD8zuZzM/arcgis/rest/services/Atlanta_Building_Permits/FeatureServer/0',
  // City of Atlanta code enforcement
  'https://opendata.arcgis.com/datasets/655f985f43cc40b4bf2ab7bc73d2169b_0/FeatureServer/0',
].filter(Boolean) as string[]

const PAGE_SIZE = 1000

export async function syncAtlanta(supabase: SupabaseClient): Promise<SyncResult> {
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
    result.errors.push('No working Atlanta ArcGIS endpoint found. Browse opendata.atlantaregional.com and set ATLANTA_ARCGIS_SERVICE env var.')
    return result
  }

  let offset = 0
  while (true) {
    const url = `${workingService}/query?where=1%3D1&outFields=*&f=json&resultRecordCount=${PAGE_SIZE}&resultOffset=${offset}&orderByFields=OBJECTID`
    let features: any[]
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
      if (!res.ok) { result.errors.push(`HTTP ${res.status} from Atlanta API`); break }
      const json = await res.json()
      features = json.features ?? []
    } catch (e) {
      result.errors.push(e instanceof Error ? e.message : String(e)); break
    }
    if (features.length === 0) break

    for (const feat of features) {
      const row = feat.attributes ?? feat
      try {
        const sourceId = String(row.OBJECTID ?? row.PermitNumber ?? row.PERMIT_NUMBER ?? row.CaseNumber ?? '')
        if (!sourceId) { result.skipped++; continue }

        const addr = row.Address ?? row.ADDRESS ?? row.StreetAddress ?? ''
        const addrNorm = normalizeAddress(addr)

        let propertyId = await resolveProperty(supabase, addrNorm, 'Atlanta', 'GA')
        if (!propertyId && addr) {
          const { data: newProp } = await supabase
            .from('properties')
            .insert({
              address_line1: addr,
              city: 'Atlanta',
              state: 'Georgia',
              state_abbr: 'GA',
              zip: row.Zip ?? row.ZIP ?? '',
              address_normalized: addrNorm,
            })
            .select('id').single()
          propertyId = newProp?.id ?? null
        }

        const filedTs = row.IssueDate ?? row.ISSUE_DATE ?? row.ApplicationDate ?? null
        const filedDate = filedTs
          ? (typeof filedTs === 'number'
              ? new Date(filedTs).toISOString().split('T')[0]
              : new Date(filedTs).toISOString().split('T')[0])
          : null

        const { error } = await supabase.from('public_records').upsert({
          source: 'atlanta_permits',
          source_id: sourceId,
          record_type: 'atlanta_violation',
          property_id: propertyId,
          title: `Atlanta: ${row.WorkType ?? row.PermitType ?? row.PERMIT_TYPE ?? 'Building Permit'}`.slice(0, 150),
          description: row.Description ?? row.WorkType ?? row.PermitType ?? null,
          severity: 'low',
          status: mapStatus(row.Status ?? row.STATUS ?? row.PermitStatus),
          filed_date: filedDate,
          source_url: 'https://opendata.atlantaregional.com',
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
  if (v.includes('final') || v.includes('complet') || v.includes('issued') || v.includes('close')) return 'closed'
  if (v.includes('pend') || v.includes('review') || v.includes('submit')) return 'pending'
  return 'open'
}
