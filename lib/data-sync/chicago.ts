/**
 * Chicago Dept of Buildings Violations
 * API: https://data.cityofchicago.org/resource/22u3-xenr.json (Socrata)
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveProperty, normalizeAddress, type SyncResult } from './utils'

const ENDPOINT = 'https://data.cityofchicago.org/resource/22u3-xenr.json'
const PAGE_SIZE = 1000

export async function syncChicago(supabase: SupabaseClient): Promise<SyncResult> {
  const result: SyncResult = { added: 0, updated: 0, skipped: 0, errors: [] }

  const since = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  let offset = 0

  while (true) {
    const url = `${ENDPOINT}?$where=violation_date>'${since}'&$limit=${PAGE_SIZE}&$offset=${offset}&$order=id`
    const res = await fetch(url, { headers: { 'X-App-Token': process.env.CHICAGO_DATA_TOKEN ?? '' } })
    if (!res.ok) { result.errors.push(`HTTP ${res.status}`); break }

    const rows: any[] = await res.json()
    if (rows.length === 0) break

    for (const row of rows) {
      try {
        const sourceId = String(row.id ?? '')
        if (!sourceId) { result.skipped++; continue }

        const addr = row.address ?? ''
        const addrNorm = normalizeAddress(addr)

        let propertyId = await resolveProperty(supabase, addrNorm, 'Chicago', 'IL')
        if (!propertyId && addr) {
          const { data: newProp } = await supabase
            .from('properties')
            .insert({ address_line1: addr, city: 'Chicago', state: 'Illinois', state_abbr: 'IL', zip: row.zip_code ?? '', address_normalized: addrNorm })
            .select('id').single()
          propertyId = newProp?.id ?? null
        }

        const { error } = await supabase.from('public_records').upsert({
          source: 'chicago_buildings',
          source_id: sourceId,
          record_type: 'chicago_violation',
          property_id: propertyId,
          title: buildChicagoTitle(row.violation_description, row.violation_ordinance, row.violation_status),
          description: [row.violation_description, row.violation_ordinance].filter(Boolean).join(' — '),
          severity: row.violation_status?.toLowerCase().includes('fail') ? 'high' : 'medium',
          status: row.violation_status_date ? 'closed' : 'open',
          filed_date: row.violation_date ? new Date(row.violation_date).toISOString().split('T')[0] : null,
          source_url: `https://www.chicago.gov/city/en/depts/bldgs/provdrs/inspect.html`,
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

function buildChicagoTitle(description: string | null, ordinance: string | null, status: string | null): string {
  const label = [description, ordinance, status].find(Boolean) ?? 'Violation'
  return `Chicago Violation: ${label}`.slice(0, 150)
}
