/**
 * San Francisco Building Complaints & Inspections
 * Primary:  https://data.sfgov.org/resource/kzem-gymc.json  (Housing Inspections)
 * Fallback: https://data.sfgov.org/resource/i98e-djp9.json  (Building Permits)
 * Both are Socrata SODA APIs on DataSF.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveProperty, normalizeAddress, type SyncResult } from './utils'

const ENDPOINTS = [
  'https://data.sfgov.org/resource/kzem-gymc.json',  // SF Housing Inspections
  'https://data.sfgov.org/resource/i98e-djp9.json',  // SF Building Permits (fallback)
]
const PAGE_SIZE = 1000

export async function syncSf(supabase: SupabaseClient): Promise<SyncResult> {
  const result: SyncResult = { added: 0, updated: 0, skipped: 0, errors: [] }

  // Tight window keeps the run inside Vercel's 5-min ceiling. Daily cron
  // means we still capture every new violation.
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  // Try endpoints in order; use first one that returns data
  let workingEndpoint: string | null = null
  for (const ep of ENDPOINTS) {
    try {
      const probe = await fetch(`${ep}?$limit=1`, {
        headers: { 'X-App-Token': process.env.SF_DATA_TOKEN ?? '' },
        signal: AbortSignal.timeout(8000),
      })
      if (probe.ok) {
        const rows = await probe.json()
        if (Array.isArray(rows)) { workingEndpoint = ep; break }
      }
    } catch { /* try next */ }
  }

  if (!workingEndpoint) {
    result.errors.push('No working SF endpoint found — all endpoints returned errors or timed out')
    return result
  }

  // Determine date filter field based on endpoint
  const isPermits = workingEndpoint.includes('i98e-djp9')
  const dateField = isPermits ? 'filed_date' : 'inspection_date'
  const idField   = isPermits ? 'permit_number' : 'inspection_id'

  let offset = 0
  while (true) {
    const where = encodeURIComponent(`${dateField}>'${since}'`)
    const url = `${workingEndpoint}?$where=${where}&$limit=${PAGE_SIZE}&$offset=${offset}&$order=${idField}`
    let rows: any[]
    try {
      const res = await fetch(url, {
        headers: { 'X-App-Token': process.env.SF_DATA_TOKEN ?? '' },
        signal: AbortSignal.timeout(15000),
      })
      if (!res.ok) { result.errors.push(`HTTP ${res.status} from SF API`); break }
      rows = await res.json()
      if (!Array.isArray(rows)) { result.errors.push('Unexpected SF API response'); break }
    } catch (e) {
      result.errors.push(e instanceof Error ? e.message : String(e)); break
    }
    if (rows.length === 0) break

    for (const row of rows) {
      try {
        const sourceId = String(row[idField] ?? row.permit_number ?? row.inspection_id ?? row.case_id ?? '')
        if (!sourceId) { result.skipped++; continue }

        const addr = row.address ?? row.street_address ?? row.location_description ?? ''
        const addrNorm = normalizeAddress(addr)

        let propertyId = await resolveProperty(supabase, addrNorm, 'San Francisco', 'CA')
        if (!propertyId && addr) {
          const { data: newProp } = await supabase
            .from('properties')
            .insert({
              address_line1: addr,
              city: 'San Francisco',
              state: 'California',
              state_abbr: 'CA',
              zip: row.zipcode ?? row.zip_code ?? '',
              address_normalized: addrNorm,
            })
            .select('id').single()
          propertyId = newProp?.id ?? null
        }

        const title = buildSfTitle(row, isPermits)
        const { error } = await supabase.from('public_records').upsert({
          source: 'sf_housing',
          source_id: sourceId,
          record_type: isPermits ? 'sf_violation' : 'sf_violation',
          property_id: propertyId,
          title,
          description: row.description ?? row.permit_type ?? row.complaint_type ?? null,
          severity: mapSfSeverity(row.priority ?? row.permit_type),
          status: mapSfStatus(row.status ?? row.permit_status ?? row.inspection_result),
          filed_date: (row[dateField] ? new Date(row[dateField]).toISOString().split('T')[0] : null),
          source_url: `https://data.sfgov.org/resource/${(workingEndpoint!.split('/resource/')[1] ?? '').replace('.json', '')}`,
          raw_data: row,
        }, { onConflict: 'source,source_id', ignoreDuplicates: false })

        if (error) { result.errors.push(error.message); continue }
        result.added++
      } catch (e) {
        result.errors.push(e instanceof Error ? e.message : String(e))
      }
    }

    offset += PAGE_SIZE
    if (rows.length < PAGE_SIZE) break
    // Cap so the run stays under Vercel's 5-min function ceiling.
    if (offset > 30_000) break
  }

  return result
}

function buildSfTitle(row: any, isPermits: boolean): string {
  if (isPermits) {
    const label = [row.permit_type, row.description].find(Boolean) ?? 'Building Permit'
    return `SF Building Permit: ${label}`.slice(0, 150)
  }
  const label = [row.description, row.complaint_type, row.inspection_type].find(Boolean) ?? 'Housing Inspection'
  return `SF Housing: ${label}`.slice(0, 150)
}

function mapSfSeverity(val: string | null | undefined): string {
  if (!val) return 'medium'
  const v = val.toLowerCase()
  if (v.includes('high') || v.includes('immed') || v.includes('emer') || v === '1') return 'high'
  if (v.includes('low') || v === '3') return 'low'
  if (v.includes('critical') || v.includes('hazard')) return 'critical'
  return 'medium'
}

function mapSfStatus(val: string | null | undefined): string {
  if (!val) return 'open'
  const v = val.toLowerCase()
  if (v.includes('close') || v.includes('complet') || v.includes('resolv') || v.includes('final')) return 'closed'
  if (v.includes('dismiss') || v.includes('withdraw')) return 'dismissed'
  if (v.includes('pend') || v.includes('review')) return 'pending'
  return 'open'
}
