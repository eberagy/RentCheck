/**
 * San Francisco Housing Inspections / Complaints
 * API: https://data.sfgov.org/resource/2u4d-tybu.json (DataSF Socrata)
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveProperty, normalizeAddress, type SyncResult } from './utils'

const ENDPOINT = 'https://data.sfgov.org/resource/2u4d-tybu.json'
const PAGE_SIZE = 1000

export async function syncSf(supabase: SupabaseClient): Promise<SyncResult> {
  const result: SyncResult = { added: 0, updated: 0, skipped: 0, errors: [] }

  const since = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  let offset = 0

  while (true) {
    const url = `${ENDPOINT}?$where=filed_date>'${since}'&$limit=${PAGE_SIZE}&$offset=${offset}&$order=case_id`
    const res = await fetch(url, { headers: { 'X-App-Token': process.env.SF_DATA_TOKEN ?? '' } })
    if (!res.ok) { result.errors.push(`HTTP ${res.status}`); break }

    const rows: any[] = await res.json()
    if (rows.length === 0) break

    for (const row of rows) {
      try {
        const sourceId = String(row.case_id ?? row.caseid ?? '')
        if (!sourceId) { result.skipped++; continue }

        const addr = row.address ?? ''
        const addrNorm = normalizeAddress(addr)

        let propertyId = await resolveProperty(supabase, addrNorm, 'San Francisco', 'CA')
        if (!propertyId && addr) {
          const { data: newProp } = await supabase
            .from('properties')
            .insert({ address_line1: addr, city: 'San Francisco', state: 'California', state_abbr: 'CA', zip: row.zip_code ?? '', address_normalized: addrNorm })
            .select('id').single()
          propertyId = newProp?.id ?? null
        }

        const { error } = await supabase.from('public_records').upsert({
          source: 'sf_housing',
          source_id: sourceId,
          record_type: 'sf_violation',
          property_id: propertyId,
          description: row.description ?? row.complaint_type ?? null,
          severity: mapSfSeverity(row.priority),
          status: row.status?.toLowerCase().includes('close') ? 'closed' : 'open',
          filed_date: row.filed_date ? new Date(row.filed_date).toISOString().split('T')[0] : null,
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

function mapSfSeverity(priority: string | null): string {
  if (!priority) return 'medium'
  const p = priority.toLowerCase()
  if (p.includes('high') || p.includes('immed') || p === '1') return 'high'
  if (p.includes('low') || p === '3') return 'low'
  return 'medium'
}
