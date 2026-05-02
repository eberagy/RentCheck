/**
 * Austin Code Enforcement Complaints
 * Portal: https://data.austintexas.gov (Socrata)
 * Tries multiple known dataset IDs in order.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveProperty, normalizeAddress, type SyncResult } from './utils'

const BASE_DOMAIN = 'https://data.austintexas.gov'
const DATASET_IDS = [
  process.env.AUSTIN_DATASET,
  '6wtj-zbtb',   // Austin Code Complaint Cases — verified 2026-05-02 (82,984 rows)
  '3ntu-iuld',   // Austin Code Cases (legacy)
  'rvvd-esxg',   // alt legacy
  '99qw-4hup',   // alt legacy
  'i26j-ai4z',   // alt legacy
].filter(Boolean) as string[]

const PAGE_SIZE = 1000

export async function syncAustin(supabase: SupabaseClient): Promise<SyncResult> {
  const result: SyncResult = { added: 0, updated: 0, skipped: 0, errors: [] }

  let workingEndpoint: string | null = null
  for (const id of DATASET_IDS) {
    const ep = `${BASE_DOMAIN}/resource/${id}.json`
    try {
      const probe = await fetch(`${ep}?$limit=1`, { signal: AbortSignal.timeout(8000) })
      if (probe.ok) {
        const rows = await probe.json()
        if (Array.isArray(rows)) { workingEndpoint = ep; break }
      }
    } catch { /* try next */ }
  }

  if (!workingEndpoint) {
    result.errors.push(
      'No working Austin dataset found. Go to data.austintexas.gov, search "code complaints", ' +
      'copy the 4x4 dataset ID, and set AUSTIN_DATASET env var.'
    )
    return result
  }

  let offset = 0

  while (true) {
    const url = `${workingEndpoint}?$limit=${PAGE_SIZE}&$offset=${offset}&$order=:id`
    let rows: any[]
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
      if (!res.ok) { result.errors.push(`HTTP ${res.status}`); break }
      rows = await res.json()
      if (!Array.isArray(rows)) break
    } catch (e) {
      result.errors.push(e instanceof Error ? e.message : String(e)); break
    }
    if (rows.length === 0) break

    for (const row of rows) {
      try {
        const sourceId = String(row.case_id ?? row.id ?? row.complaint_id ?? '')
        if (!sourceId) { result.skipped++; continue }

        const addr = row.address ?? row.property_address ?? row.location_address ?? ''
        const addrNorm = normalizeAddress(addr)

        let propertyId = await resolveProperty(supabase, addrNorm, 'Austin', 'TX')
        if (!propertyId && addr) {
          const { data: newProp } = await supabase
            .from('properties')
            .insert({ address_line1: addr, city: 'Austin', state: 'Texas', state_abbr: 'TX', zip: row.zip ?? row.zip_code ?? '', address_normalized: addrNorm })
            .select('id').single()
          propertyId = newProp?.id ?? null
        }

        const { error } = await supabase.from('public_records').upsert({
          source: 'austin_code',
          source_id: sourceId,
          record_type: 'austin_complaint',
          property_id: propertyId,
          title: buildAustinTitle(row.description, row.case_type, row.status_current ?? row.status),
          description: row.description ?? row.case_type ?? null,
          severity: 'medium',
          status: (row.status_current ?? row.status ?? '').toLowerCase().includes('close') ? 'closed' : 'open',
          filed_date: (row.opened_date ?? row.date_entered ?? row.open_date ?? row.created_date)
            ? new Date(row.opened_date ?? row.date_entered ?? row.open_date ?? row.created_date).toISOString().split('T')[0]
            : null,
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

function buildAustinTitle(description: string | null, caseType: string | null, status: string | null): string {
  const label = [description, caseType, status].find(Boolean) ?? 'Code Complaint'
  return `Austin Complaint: ${label}`.slice(0, 150)
}
