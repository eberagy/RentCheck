/**
 * Philadelphia Licenses & Inspections Violations
 * API: https://phl.carto.com/api/v2/sql (CartoDB/Socrata fallback)
 * Primary: https://data.phila.gov/resource/4t5c-jqex.json
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveProperty, normalizeAddress, type SyncResult } from './utils'

const ENDPOINT = 'https://data.phila.gov/resource/4t5c-jqex.json'
const PAGE_SIZE = 1000

export async function syncPhiladelphia(supabase: SupabaseClient): Promise<SyncResult> {
  const result: SyncResult = { added: 0, updated: 0, skipped: 0, errors: [] }

  const since = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  let offset = 0

  while (true) {
    const url = `${ENDPOINT}?$where=violationdate>'${since}'&$limit=${PAGE_SIZE}&$offset=${offset}&$order=casenumber`
    const res = await fetch(url, { headers: { 'X-App-Token': process.env.PHILLY_DATA_TOKEN ?? '' } })
    if (!res.ok) { result.errors.push(`HTTP ${res.status}`); break }

    const rows: any[] = await res.json()
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
            .insert({ address_line1: addr, city: 'Philadelphia', state: 'Pennsylvania', state_abbr: 'PA', zip: row.zip ?? '', address_normalized: addrNorm })
            .select('id').single()
          propertyId = newProp?.id ?? null
        }

        const { error } = await supabase.from('public_records').upsert({
          source: 'philly_li',
          source_id: sourceId,
          record_type: 'philly_violation',
          property_id: propertyId,
          description: row.violationdescription ?? row.casetype ?? null,
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
