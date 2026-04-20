/**
 * Detroit, MI — Blight Violations & Property Maintenance
 * API: https://data.detroitmi.gov (Socrata)
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveProperty, normalizeAddress, type SyncResult } from './utils'

const ENDPOINTS = [
  'https://data.detroitmi.gov/resource/s2p9-16v9.json', // Blight Violations
  'https://data.detroitmi.gov/resource/xw2h-cuvw.json', // Demo permits
  'https://data.detroitmi.gov/resource/3gtu-9si8.json', // DBA violations
]
const PAGE_SIZE = 1000

export async function syncDetroit(supabase: SupabaseClient): Promise<SyncResult> {
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
    result.errors.push('No working Detroit endpoint found')
    return result
  }

  let offset = 0
  while (true) {
    const url = `${workingEndpoint}?$where=ticket_issued_time>'${since}'&$limit=${PAGE_SIZE}&$offset=${offset}`
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
        const sourceId = String(row.ticket_number ?? row.id ?? row.objectid ?? '')
        if (!sourceId) { result.skipped++; continue }

        const addr = row.violation_address ?? row.address ?? row.location ?? ''
        const addrNorm = normalizeAddress(addr)
        let propertyId = await resolveProperty(supabase, addrNorm, 'Detroit', 'MI')
        if (!propertyId && addr) {
          const { data: newProp } = await supabase.from('properties').insert({
            address_line1: addr, city: 'Detroit', state: 'Michigan', state_abbr: 'MI',
            zip: row.zip_code ?? '', address_normalized: addrNorm,
          }).select('id').single()
          propertyId = newProp?.id ?? null
        }

        const { error } = await supabase.from('public_records').upsert({
          source: 'detroit_blight',
          source_id: sourceId,
          record_type: 'detroit_violation',
          property_id: propertyId,
          title: buildTitle(row),
          description: row.violation_description ?? row.ordinance_description ?? row.description ?? null,
          severity: mapSeverity(row.disposition ?? row.judgment),
          status: mapStatus(row.disposition ?? row.status),
          filed_date: (row.ticket_issued_time ?? row.violation_date) ? new Date(row.ticket_issued_time ?? row.violation_date).toISOString().split('T')[0] : null,
          source_url: 'https://detroitmi.gov/departments/buildings-safety-engineering-and-environmental-department',
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
  const t = row.violation_description ?? row.ordinance_description ?? row.description ?? 'Blight Violation'
  return `Detroit: ${t}`.slice(0, 150)
}
function mapSeverity(v: string | null): string {
  if (!v) return 'medium'
  const u = v.toLowerCase()
  if (u.includes('responsible') || u.includes('guilty') || u.includes('liable')) return 'high'
  if (u.includes('dismiss') || u.includes('not responsible')) return 'low'
  return 'medium'
}
function mapStatus(v: string | null): string {
  if (!v) return 'open'
  const u = v.toLowerCase()
  if (u.includes('paid') || u.includes('satisfied') || u.includes('closed')) return 'closed'
  if (u.includes('dismiss') || u.includes('not responsible')) return 'dismissed'
  return 'open'
}
