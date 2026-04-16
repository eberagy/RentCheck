/**
 * Boston Inspectional Services Violations
 * API: https://data.boston.gov/api/3/action/datastore_search (CKAN)
 * Resource ID: 90ed3816-5e70-443c-803d-9a71f6a7a77f
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveProperty, normalizeAddress, type SyncResult } from './utils'

const ENDPOINT = 'https://data.boston.gov/api/3/action/datastore_search'
const RESOURCE_ID = '90ed3816-5e70-443c-803d-9a71f6a7a77f'
const PAGE_SIZE = 1000

export async function syncBoston(supabase: SupabaseClient): Promise<SyncResult> {
  const result: SyncResult = { added: 0, updated: 0, skipped: 0, errors: [] }

  let offset = 0

  while (true) {
    const url = `${ENDPOINT}?resource_id=${RESOURCE_ID}&limit=${PAGE_SIZE}&offset=${offset}`
    const res = await fetch(url)
    if (!res.ok) { result.errors.push(`HTTP ${res.status}`); break }

    const json = await res.json()
    const rows: any[] = json.result?.records ?? []
    if (rows.length === 0) break

    for (const row of rows) {
      try {
        const sourceId = String(row.case_no ?? row._id ?? '')
        if (!sourceId) { result.skipped++; continue }

        const addr = [row.address, row.city].filter(Boolean).join(', ')
        const street = row.address ?? ''
        const addrNorm = normalizeAddress(street)

        let propertyId = await resolveProperty(supabase, addrNorm, 'Boston', 'MA')
        if (!propertyId && street) {
          const { data: newProp } = await supabase
            .from('properties')
            .insert({ address_line1: street, city: 'Boston', state: 'Massachusetts', state_abbr: 'MA', zip: row.zip ?? '', address_normalized: addrNorm })
            .select('id').single()
          propertyId = newProp?.id ?? null
        }

        const { error } = await supabase.from('public_records').upsert({
          source: 'boston_isd',
          source_id: sourceId,
          record_type: 'boston_violation',
          property_id: propertyId,
          description: row.description ?? row.code_description ?? null,
          severity: 'medium',
          status: row.status?.toLowerCase().includes('close') ? 'closed' : 'open',
          filed_date: row.open_dt ? new Date(row.open_dt).toISOString().split('T')[0] : null,
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
    if (offset > 20000) break
  }

  return result
}
