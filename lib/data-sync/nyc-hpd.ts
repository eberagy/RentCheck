/**
 * NYC HPD Housing Violations Sync
 * API: https://data.cityofnewyork.us/resource/wvxf-dwi5.json (Socrata)
 * Updates daily — fetches violations modified in the last 2 days for safety
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveOrQueueLandlord, resolveProperty, normalizeAddress, type SyncResult } from './utils'

const ENDPOINT = 'https://data.cityofnewyork.us/resource/wvxf-dwi5.json'
const PAGE_SIZE = 1000

export async function syncNycHpd(supabase: SupabaseClient): Promise<SyncResult> {
  const result: SyncResult = { added: 0, updated: 0, skipped: 0, errors: [] }

  const since = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  let offset = 0

  while (true) {
    const url = `${ENDPOINT}?$where=inspectiondate>'${since}'&$limit=${PAGE_SIZE}&$offset=${offset}&$order=violationid`
    const res = await fetch(url, { headers: { 'X-App-Token': process.env.NYC_OPEN_DATA_TOKEN ?? '' } })
    if (!res.ok) { result.errors.push(`HTTP ${res.status}`); break }

    const rows: any[] = await res.json()
    if (rows.length === 0) break

    for (const row of rows) {
      try {
        const sourceId = String(row.violationid ?? '')
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
              zip: row.postcode ?? '',
              address_normalized: addrNorm,
            })
            .select('id')
            .single()
          propertyId = newProp?.id ?? null
        }

        const landlordName = row.ownername ?? null
        const landlordId = landlordName
          ? await resolveOrQueueLandlord(supabase, landlordName, city, state)
          : null

        const record = {
          source: 'nyc_hpd' as const,
          source_id: sourceId,
          record_type: 'hpd_violation' as const,
          landlord_id: landlordId,
          property_id: propertyId,
          description: row.novdescription ?? row.class ?? null,
          severity: mapHpdClass(row.class),
          status: mapHpdStatus(row.currentstatus),
          filed_date: row.approveddate ? new Date(row.approveddate).toISOString().split('T')[0] : null,
          resolved_date: row.closedate ? new Date(row.closedate).toISOString().split('T')[0] : null,
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

function mapHpdClass(c: string | null): string {
  if (!c) return 'unknown'
  const cl = c.toUpperCase()
  if (cl === 'A') return 'low'
  if (cl === 'B') return 'medium'
  if (cl === 'C') return 'high'
  if (cl === 'I') return 'high' // Immediately hazardous
  return 'unknown'
}

function mapHpdStatus(s: string | null): string {
  if (!s) return 'unknown'
  const sl = s.toLowerCase()
  if (sl.includes('close') || sl.includes('dismiss')) return 'closed'
  if (sl.includes('open') || sl.includes('active')) return 'open'
  return s
}
