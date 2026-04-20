/**
 * NYC DOB (Dept of Buildings) Complaints Sync
 * API: https://data.cityofnewyork.us/resource/eabe-havv.json (Socrata)
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveProperty, normalizeAddress, type SyncResult } from './utils'

const ENDPOINT = 'https://data.cityofnewyork.us/resource/eabe-havv.json'
const PAGE_SIZE = 1000

export async function syncNycDob(supabase: SupabaseClient): Promise<SyncResult> {
  const result: SyncResult = { added: 0, updated: 0, skipped: 0, errors: [] }

  let offset = 0

  while (true) {
    const url = `${ENDPOINT}?$limit=${PAGE_SIZE}&$offset=${offset}&$order=complaintnumber`
    const res = await fetch(url, { headers: { 'X-App-Token': process.env.NYC_OPEN_DATA_TOKEN ?? '' } })
    if (!res.ok) { result.errors.push(`HTTP ${res.status}`); break }

    const rows: any[] = await res.json()
    if (rows.length === 0) break

    // Cap at 100k records per run to avoid timeout
    if (offset > 100000) break

    for (const row of rows) {
      try {
        const sourceId = String(row.complaintnumber ?? '')
        if (!sourceId) { result.skipped++; continue }

        const addr = [row.housenumber, row.streetname].filter(Boolean).join(' ')
        const addrNorm = normalizeAddress(addr)
        const city = 'New York City'
        const state = 'NY'

        let propertyId = await resolveProperty(supabase, addrNorm, city, state)
        if (!propertyId && addr) {
          const { data: newProp } = await supabase
            .from('properties')
            .insert({
              address_line1: addr,
              city,
              state: 'New York',
              state_abbr: state,
              zip: row.zipcode ?? '',
              address_normalized: addrNorm,
            })
            .select('id')
            .single()
          propertyId = newProp?.id ?? null
        }

        const record = {
          source: 'nyc_dob' as const,
          source_id: sourceId,
          record_type: 'dob_complaint' as const,
          property_id: propertyId,
          title: buildDobTitle(row.complaintcategory, row.status),
          description: row.complaintcategory ?? row.status ?? null,
          severity: 'medium',
          status: row.status?.toLowerCase().includes('close') ? 'closed' : 'open',
          filed_date: row.dateentered ? new Date(row.dateentered).toISOString().split('T')[0] : null,
          raw_data: row,
        }

        const { error } = await supabase.from('public_records').upsert(record, { onConflict: 'source,source_id', ignoreDuplicates: false })
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

function buildDobTitle(category: string | null, status: string | null): string {
  const label = [category, status].find(Boolean) ?? 'Complaint'
  return `DOB Complaint: ${label}`.slice(0, 150)
}
