/**
 * Portland, OR — Bureau of Development Services Complaints & Violations
 * API: https://opendata.portland.gov (Socrata)
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveProperty, normalizeAddress, type SyncResult } from './utils'

const ENDPOINTS = [
  'https://opendata.portland.gov/resource/mqgu-b77j.json', // Code enforcement cases
  'https://opendata.portland.gov/resource/pxeg-5w2r.json', // BDS permit activity
  'https://opendata.portland.gov/resource/faj2-xwrm.json', // Rental housing complaints
]
const PAGE_SIZE = 1000

export async function syncPortland(supabase: SupabaseClient): Promise<SyncResult> {
  const result: SyncResult = { added: 0, updated: 0, skipped: 0, errors: [] }

  let workingEndpoint: string | null = null
  for (const ep of ENDPOINTS) {
    try {
      const probe = await fetch(`${ep}?$limit=1`, { signal: AbortSignal.timeout(8000) })
      if (probe.ok) {
        const rows = await probe.json()
        if (Array.isArray(rows) && rows.length > 0) { workingEndpoint = ep; break }
      }
    } catch { /* try next */ }
  }

  if (!workingEndpoint) {
    result.errors.push('No working Portland endpoint found')
    return result
  }

  let offset = 0
  while (true) {
    const url = `${workingEndpoint}?$limit=${PAGE_SIZE}&$offset=${offset}&$order=:id`
    let rows: any[]
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(30000) })
      if (!res.ok) { result.errors.push(`HTTP ${res.status}`); break }
      rows = await res.json()
    } catch (e) {
      result.errors.push(e instanceof Error ? e.message : String(e)); break
    }
    if (rows.length === 0) break

    for (const row of rows) {
      try {
        const sourceId = String(row.case_number ?? row.record_id ?? row.objectid ?? '')
        if (!sourceId) { result.skipped++; continue }

        const addr = row.site_address ?? row.address ?? row.location ?? ''
        const addrNorm = normalizeAddress(addr)
        let propertyId = await resolveProperty(supabase, addrNorm, 'Portland', 'OR')
        if (!propertyId && addr) {
          const { data: newProp } = await supabase.from('properties').insert({
            address_line1: addr, city: 'Portland', state: 'Oregon', state_abbr: 'OR',
            zip: row.zip_code ?? '', address_normalized: addrNorm,
          }).select('id').single()
          propertyId = newProp?.id ?? null
        }

        const { error } = await supabase.from('public_records').upsert({
          source: 'portland_bds',
          source_id: sourceId,
          record_type: 'portland_violation',
          property_id: propertyId,
          title: buildTitle(row),
          description: row.case_type ?? row.violation_description ?? row.complaint_type ?? null,
          severity: mapSeverity(row.priority ?? row.case_class),
          status: mapStatus(row.status ?? row.case_status),
          filed_date: (row.case_date ?? row.open_date) ? new Date(row.case_date ?? row.open_date).toISOString().split('T')[0] : null,
          source_url: 'https://www.portland.gov/bds/code-enforcement',
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
    if (offset > 100000) break
  }

  return result
}

function buildTitle(row: any): string {
  const t = row.case_type ?? row.violation_description ?? row.complaint_type ?? 'Code Violation'
  return `Portland: ${t}`.slice(0, 150)
}
function mapSeverity(v: string | null): string {
  if (!v) return 'medium'
  const u = v.toLowerCase()
  if (u.includes('immedi') || u.includes('emergency') || u.includes('high') || u === 'a') return 'high'
  if (u.includes('low') || u.includes('minor') || u === 'c') return 'low'
  return 'medium'
}
function mapStatus(v: string | null): string {
  if (!v) return 'open'
  const u = v.toLowerCase()
  if (u.includes('closed') || u.includes('compli') || u.includes('resolved')) return 'closed'
  if (u.includes('dismiss') || u.includes('void')) return 'dismissed'
  return 'open'
}
