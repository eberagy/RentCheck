/**
 * NYC DOB (Dept of Buildings) Complaints Sync
 * API: https://data.cityofnewyork.us/resource/eabe-havv.json (Socrata)
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeAddress, batchUpsert, withRetry, type SyncResult } from './utils'

const ENDPOINT = 'https://data.cityofnewyork.us/resource/eabe-havv.json'
const PAGE_SIZE = 1000

export async function syncNycDob(supabase: SupabaseClient): Promise<SyncResult> {
  const result: SyncResult = { added: 0, updated: 0, skipped: 0, errors: [] }

  let offset = 0

  while (true) {
    const url = `${ENDPOINT}?$limit=${PAGE_SIZE}&$offset=${offset}&$order=complaint_number`
    let rows: any[]
    try {
      const res = await withRetry(() => fetch(url, {
        headers: { 'X-App-Token': process.env.NYC_OPEN_DATA_TOKEN ?? '' },
        signal: AbortSignal.timeout(20000),
      }))
      if (!res.ok) { result.errors.push(`HTTP ${res.status}`); break }
      rows = await res.json()
    } catch (e) { result.errors.push(e instanceof Error ? e.message : String(e)); break }
    if (!rows.length) break

    // Batch-upsert properties. Socrata uses snake_case column names.
    const uniqueAddrs = new Map<string, { addr: string; zip: string }>()
    for (const row of rows) {
      const addr = [row.house_number, row.house_street].filter(Boolean).join(' ')
      if (addr) uniqueAddrs.set(normalizeAddress(addr), { addr, zip: row.zip_code ?? '' })
    }
    const propRows = Array.from(uniqueAddrs.entries()).map(([norm, v]) => ({
      address_line1: v.addr, city: 'New York City', state: 'New York',
      state_abbr: 'NY', zip: v.zip, address_normalized: norm,
    }))
    const propIdMap = new Map<string, string>()
    for (let i = 0; i < propRows.length; i += 200) {
      const slice = propRows.slice(i, i + 200)
      const { data } = await supabase.from('properties')
        .upsert(slice, { onConflict: 'address_normalized,city,state_abbr', ignoreDuplicates: true })
        .select('id, address_normalized')
      for (const p of data ?? []) if (p.address_normalized) propIdMap.set(p.address_normalized, p.id)
      const missing = slice
        .map(r => r.address_normalized)
        .filter((norm): norm is string => typeof norm === 'string' && !propIdMap.has(norm))
      if (missing.length) {
        const { data: existing } = await supabase.from('properties')
          .select('id, address_normalized')
          .in('address_normalized', missing)
          .eq('state_abbr', 'NY')
        for (const p of existing ?? []) if (p.address_normalized) propIdMap.set(p.address_normalized, p.id)
      }
    }

    // Build record rows
    const toInsert: Record<string, unknown>[] = []
    for (const row of rows) {
      const sourceId = String(row.complaint_number ?? '')
      if (!sourceId) { result.skipped++; continue }
      const addr = [row.house_number, row.house_street].filter(Boolean).join(' ')
      const propertyId = addr ? (propIdMap.get(normalizeAddress(addr)) ?? null) : null
      // date_entered comes back as MM/DD/YYYY; strip to YYYY-MM-DD for Postgres date.
      let filedDate: string | null = null
      if (row.date_entered) {
        const d = new Date(row.date_entered)
        if (!isNaN(d.getTime())) filedDate = d.toISOString().split('T')[0] ?? null
      }
      toInsert.push({
        source: 'nyc_dob', source_id: sourceId, record_type: 'dob_complaint',
        property_id: propertyId,
        title: `DOB Complaint: ${row.complaint_category ?? row.status ?? 'Complaint'}`.slice(0, 150),
        description: row.complaint_category ?? row.status ?? null,
        severity: 'medium',
        status: (row.status ?? '').toLowerCase().includes('close') ? 'closed' : 'open',
        filed_date: filedDate,
        raw_data: row,
      })
    }

    await batchUpsert(supabase, toInsert, result)
    offset += PAGE_SIZE
    if (rows.length < PAGE_SIZE) break
    if (offset > 100_000) break
  }

  return result
}
