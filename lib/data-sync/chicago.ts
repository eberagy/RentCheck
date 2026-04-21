/**
 * Chicago Dept of Buildings Violations
 * API: https://data.cityofchicago.org/resource/22u3-xenr.json (Socrata)
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeAddress, batchUpsert, type SyncResult } from './utils'

const ENDPOINT = 'https://data.cityofchicago.org/resource/22u3-xenr.json'
const PAGE_SIZE = 1000

export async function syncChicago(supabase: SupabaseClient): Promise<SyncResult> {
  const result: SyncResult = { added: 0, updated: 0, skipped: 0, errors: [] }

  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  let offset = 0

  while (true) {
    const url = `${ENDPOINT}?$where=violation_date>'${since}'&$limit=${PAGE_SIZE}&$offset=${offset}&$order=id`
    let rows: any[]
    try {
      const res = await fetch(url, { headers: { 'X-App-Token': process.env.CHICAGO_DATA_TOKEN ?? '' } })
      if (!res.ok) { result.errors.push(`HTTP ${res.status}`); break }
      rows = await res.json()
    } catch (e) { result.errors.push(e instanceof Error ? e.message : String(e)); break }
    if (!rows.length) break

    // Batch-upsert properties
    const uniqueAddrs = new Map<string, string>()
    for (const row of rows) {
      const addr = row.address ?? ''
      if (addr) uniqueAddrs.set(normalizeAddress(addr), addr)
    }
    const propRows = Array.from(uniqueAddrs.entries()).map(([norm, addr]) => ({
      address_line1: addr, city: 'Chicago', state: 'Illinois',
      state_abbr: 'IL', zip: '', address_normalized: norm,
    }))
    const propertyMap = new Map<string, string>()
    for (let i = 0; i < propRows.length; i += 200) {
      const { data } = await supabase.from('properties')
        .upsert(propRows.slice(i, i + 200), { onConflict: 'address_normalized,city,state_abbr', ignoreDuplicates: true })
        .select('id, address_normalized')
      for (const p of data ?? []) if (p.address_normalized) propertyMap.set(p.address_normalized, p.id)
    }

    const toInsert: Record<string, unknown>[] = []
    for (const row of rows) {
      const sourceId = String(row.id ?? '')
      if (!sourceId) { result.skipped++; continue }
      const addr = row.address ?? ''
      const propertyId = addr ? (propertyMap.get(normalizeAddress(addr)) ?? null) : null
      toInsert.push({
        source: 'chicago_buildings', source_id: sourceId, record_type: 'chicago_violation',
        property_id: propertyId,
        title: `Chicago Violation: ${[row.violation_description, row.violation_status].find(Boolean) ?? 'Code Violation'}`.slice(0, 150),
        description: [row.violation_description, row.violation_ordinance].filter(Boolean).join(' — ') || null,
        severity: row.violation_status?.toLowerCase().includes('fail') ? 'high' : 'medium',
        status: row.violation_status_date ? 'closed' : 'open',
        filed_date: row.violation_date ? new Date(row.violation_date).toISOString().split('T')[0] : null,
        source_url: 'https://www.chicago.gov/city/en/depts/bldgs/provdrs/inspect.html',
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
