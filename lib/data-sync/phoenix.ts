/**
 * Phoenix, AZ — Code Enforcement Cases
 * API: https://data.phoenix.gov (Socrata)
 * Dataset: wkdj-m5d4 (Code Enforcement Cases)
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveProperty, normalizeAddress, type SyncResult } from './utils'

const ENDPOINTS = [
  'https://data.phoenix.gov/resource/wkdj-m5d4.json', // Code Enforcement Cases
  'https://data.phoenix.gov/resource/9pf7-xxqe.json',  // Building Permits
]
const PAGE_SIZE = 1000

export async function syncPhoenix(supabase: SupabaseClient): Promise<SyncResult> {
  const result: SyncResult = { added: 0, updated: 0, skipped: 0, errors: [] }
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

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
    result.errors.push('No working Phoenix endpoint found')
    return result
  }

  let offset = 0
  while (true) {
    const url = `${workingEndpoint}?$where=case_opened_date>'${since}'&$limit=${PAGE_SIZE}&$offset=${offset}&$order=case_number`
    let rows: any[]
    try {
      const res = await fetch(url, {
        headers: { 'X-App-Token': process.env.PHOENIX_DATA_TOKEN ?? '' },
        signal: AbortSignal.timeout(30000),
      })
      if (!res.ok) { result.errors.push(`HTTP ${res.status}`); break }
      rows = await res.json()
    } catch (e) {
      result.errors.push(e instanceof Error ? e.message : String(e)); break
    }
    if (rows.length === 0) break

    for (const row of rows) {
      try {
        const sourceId = String(row.case_number ?? row.id ?? '')
        if (!sourceId) { result.skipped++; continue }

        const addr = [row.address, row.street_address, row.location_address].find(Boolean) ?? ''
        const addrNorm = normalizeAddress(addr)
        let propertyId = await resolveProperty(supabase, addrNorm, 'Phoenix', 'AZ')
        if (!propertyId && addr) {
          const { data: newProp } = await supabase.from('properties').insert({
            address_line1: addr, city: 'Phoenix', state: 'Arizona', state_abbr: 'AZ',
            zip: row.zip_code ?? '', address_normalized: addrNorm,
          }).select('id').single()
          propertyId = newProp?.id ?? null
        }

        const { error } = await supabase.from('public_records').upsert({
          source: 'phoenix_code',
          source_id: sourceId,
          record_type: 'phoenix_violation',
          property_id: propertyId,
          title: buildTitle(row),
          description: row.case_type ?? row.violation_description ?? row.complaint_type ?? null,
          severity: mapSeverity(row.priority ?? row.violation_class),
          status: mapStatus(row.case_status ?? row.status),
          filed_date: row.case_opened_date ? new Date(row.case_opened_date).toISOString().split('T')[0] : null,
          source_url: `https://www.phoenix.gov/pdd/code-enforcement`,
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
  }

  return result
}

function buildTitle(row: any): string {
  const t = row.case_type ?? row.violation_description ?? row.complaint_type ?? 'Code Violation'
  return `Phoenix: ${t}`.slice(0, 150)
}
function mapSeverity(v: string | null): string {
  if (!v) return 'medium'
  const u = v.toLowerCase()
  if (u.includes('critical') || u.includes('immediate') || u.includes('high')) return 'high'
  if (u.includes('low') || u.includes('minor')) return 'low'
  return 'medium'
}
function mapStatus(v: string | null): string {
  if (!v) return 'open'
  const u = v.toLowerCase()
  if (u.includes('closed') || u.includes('resolved') || u.includes('compli')) return 'closed'
  if (u.includes('dismiss')) return 'dismissed'
  return 'open'
}
