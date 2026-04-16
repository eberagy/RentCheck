/**
 * Seattle Rental Housing Code Violations
 * API: https://data.seattle.gov/resource/jtgu-b86t.json (Socrata)
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveProperty, normalizeAddress, type SyncResult } from './utils'

const ENDPOINT = 'https://data.seattle.gov/resource/jtgu-b86t.json'
const PAGE_SIZE = 1000

export async function syncSeattle(supabase: SupabaseClient): Promise<SyncResult> {
  const result: SyncResult = { added: 0, updated: 0, skipped: 0, errors: [] }

  const since = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  let offset = 0

  while (true) {
    const url = `${ENDPOINT}?$where=original_file_date>'${since}'&$limit=${PAGE_SIZE}&$offset=${offset}&$order=case_number`
    const res = await fetch(url)
    if (!res.ok) { result.errors.push(`HTTP ${res.status}`); break }

    const rows: any[] = await res.json()
    if (rows.length === 0) break

    for (const row of rows) {
      try {
        const sourceId = String(row.case_number ?? '')
        if (!sourceId) { result.skipped++; continue }

        const addr = row.property_address ?? ''
        const addrNorm = normalizeAddress(addr)

        let propertyId = await resolveProperty(supabase, addrNorm, 'Seattle', 'WA')
        if (!propertyId && addr) {
          const { data: newProp } = await supabase
            .from('properties')
            .insert({ address_line1: addr, city: 'Seattle', state: 'Washington', state_abbr: 'WA', zip: row.zip ?? '', address_normalized: addrNorm })
            .select('id').single()
          propertyId = newProp?.id ?? null
        }

        const { error } = await supabase.from('public_records').upsert({
          source: 'seattle_sdci',
          source_id: sourceId,
          record_type: 'seattle_violation',
          property_id: propertyId,
          description: row.description ?? row.complaint_type ?? null,
          severity: row.priority ? mapPriority(row.priority) : 'medium',
          status: row.status?.toLowerCase().includes('close') ? 'closed' : 'open',
          filed_date: row.original_file_date ? new Date(row.original_file_date).toISOString().split('T')[0] : null,
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

function mapPriority(p: string): string {
  const l = p.toLowerCase()
  if (l.includes('high') || l.includes('urgent') || l === '1') return 'high'
  if (l.includes('low') || l === '3') return 'low'
  return 'medium'
}
