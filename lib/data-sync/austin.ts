/**
 * Austin Code Enforcement Complaints
 * API: https://data.austintexas.gov/resource/i26j-ai4z.json (Socrata)
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveProperty, normalizeAddress, type SyncResult } from './utils'

const ENDPOINT = 'https://data.austintexas.gov/resource/i26j-ai4z.json'
const PAGE_SIZE = 1000

export async function syncAustin(supabase: SupabaseClient): Promise<SyncResult> {
  const result: SyncResult = { added: 0, updated: 0, skipped: 0, errors: [] }

  const since = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  let offset = 0

  while (true) {
    const url = `${ENDPOINT}?$where=date_entered>'${since}'&$limit=${PAGE_SIZE}&$offset=${offset}&$order=case_id`
    const res = await fetch(url)
    if (!res.ok) { result.errors.push(`HTTP ${res.status}`); break }

    const rows: any[] = await res.json()
    if (rows.length === 0) break

    for (const row of rows) {
      try {
        const sourceId = String(row.case_id ?? '')
        if (!sourceId) { result.skipped++; continue }

        const addr = row.address ?? ''
        const addrNorm = normalizeAddress(addr)

        let propertyId = await resolveProperty(supabase, addrNorm, 'Austin', 'TX')
        if (!propertyId && addr) {
          const { data: newProp } = await supabase
            .from('properties')
            .insert({ address_line1: addr, city: 'Austin', state: 'Texas', state_abbr: 'TX', zip: row.zip ?? '', address_normalized: addrNorm })
            .select('id').single()
          propertyId = newProp?.id ?? null
        }

        const { error } = await supabase.from('public_records').upsert({
          source: 'austin_code',
          source_id: sourceId,
          record_type: 'austin_complaint',
          property_id: propertyId,
          description: row.description ?? row.case_type ?? null,
          severity: 'medium',
          status: row.status_current?.toLowerCase().includes('close') ? 'closed' : 'open',
          filed_date: row.date_entered ? new Date(row.date_entered).toISOString().split('T')[0] : null,
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
