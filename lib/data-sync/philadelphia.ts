/**
 * Philadelphia Licenses & Inspections Violations
 * API: https://phl.carto.com/api/v2/sql (CartoDB — no token required)
 * Dataset: https://opendataphilly.org/datasets/licenses-and-inspections-code-violations
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveProperty, normalizeAddress, type SyncResult } from './utils'

const CARTO_ENDPOINT = 'https://phl.carto.com/api/v2/sql'
const PAGE_SIZE = 1000

export async function syncPhiladelphia(supabase: SupabaseClient): Promise<SyncResult> {
  const result: SyncResult = { added: 0, updated: 0, skipped: 0, errors: [] }

  const since = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  let offset = 0

  while (true) {
    const sql = `
      SELECT casenumber, address, zip, violationdate, violationdescription,
             casetype, casestatus, caseprioritydesc
      FROM li_violations
      WHERE violationdate > '${since}'
      ORDER BY casenumber
      LIMIT ${PAGE_SIZE} OFFSET ${offset}
    `
    const url = `${CARTO_ENDPOINT}?q=${encodeURIComponent(sql)}`
    const res = await fetch(url)
    if (!res.ok) { result.errors.push(`HTTP ${res.status}: ${await res.text()}`); break }

    const json: { rows: any[] } = await res.json()
    const rows = json.rows ?? []
    if (rows.length === 0) break

    for (const row of rows) {
      try {
        const sourceId = String(row.casenumber ?? '')
        if (!sourceId) { result.skipped++; continue }

        const addr = row.address ?? ''
        const addrNorm = normalizeAddress(addr)

        let propertyId = await resolveProperty(supabase, addrNorm, 'Philadelphia', 'PA')
        if (!propertyId && addr) {
          const { data: newProp } = await supabase
            .from('properties')
            .insert({
              address_line1: addr,
              city: 'Philadelphia',
              state: 'Pennsylvania',
              state_abbr: 'PA',
              zip: row.zip ?? '',
              address_normalized: addrNorm,
            })
            .select('id')
            .single()
          propertyId = newProp?.id ?? null
        }

        const { error } = await supabase.from('public_records').upsert({
          source: 'philadelphia',
          source_id: sourceId,
          record_type: 'philly_violation',
          property_id: propertyId,
          title: row.violationdescription ?? row.casetype ?? 'L&I Violation',
          description: row.casetype ?? null,
          severity: row.caseprioritydesc?.toLowerCase().includes('immed') ? 'high' : 'medium',
          status: row.casestatus?.toLowerCase().includes('close') ? 'closed' : 'open',
          filed_date: row.violationdate ? new Date(row.violationdate).toISOString().split('T')[0] : null,
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
