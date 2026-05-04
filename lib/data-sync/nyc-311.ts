/**
 * NYC 311 Housing Complaints
 * API: https://data.cityofnewyork.us/resource/erm2-nwe9.json (Socrata)
 * Filters for housing-related complaint types only
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeAddress, batchUpsert, upsertPropertiesAndMap, type SyncResult } from './utils'

const ENDPOINT = 'https://data.cityofnewyork.us/resource/erm2-nwe9.json'
const PAGE_SIZE = 1000

export async function syncNyc311(supabase: SupabaseClient): Promise<SyncResult> {
  const result: SyncResult = { added: 0, updated: 0, skipped: 0, errors: [] }
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

  // Filter by HPD agency only (keeps URL short — HPD handles all housing complaints)
  let offset = 0
  while (true) {
    // Socrata expects URL-encoded $where; an unencoded `>` and `'` returned HTTP 400.
    const where = encodeURIComponent(`created_date>'${since}' AND agency='HPD'`)
    const url = `${ENDPOINT}?$where=${where}&$limit=${PAGE_SIZE}&$offset=${offset}&$order=unique_key`
    let rows: any[]
    try {
      const res = await fetch(url, {
        headers: { 'X-App-Token': process.env.NYC_OPEN_DATA_TOKEN ?? '' },
        signal: AbortSignal.timeout(30000),
      })
      if (!res.ok) { result.errors.push(`HTTP ${res.status}`); break }
      rows = await res.json()
    } catch (e) {
      result.errors.push(e instanceof Error ? e.message : String(e)); break
    }
    if (rows.length === 0) break
    if (offset > 100000) break

    const uniqueAddrs = new Map<string, { addr: string; zip: string }>()
    for (const row of rows) {
      const addr = ([row.incident_address, row.street_address].find(Boolean) ?? '').trim()
      if (!addr) continue
      const norm = normalizeAddress(addr)
      if (norm && !uniqueAddrs.has(norm)) uniqueAddrs.set(norm, { addr, zip: row.incident_zip ?? row.zip_code ?? '' })
    }
    const propRows = Array.from(uniqueAddrs.entries()).map(([norm, v]) => ({
      address_line1: v.addr, city: 'New York', state: 'New York',
      state_abbr: 'NY', zip: v.zip, address_normalized: norm,
    }))
    const propIdMap = await upsertPropertiesAndMap(supabase, propRows, result)

    const toInsert: Record<string, unknown>[] = []
    for (const row of rows) {
      const sourceId = String(row.unique_key ?? '')
      if (!sourceId) { result.skipped++; continue }
      const addr = [row.incident_address, row.street_address].find(Boolean) ?? ''
      const propertyId = addr ? (propIdMap.get(normalizeAddress(addr)) ?? null) : null
      toInsert.push({
        source: 'nyc_311',
        source_id: sourceId,
        record_type: 'nyc_311',
        property_id: propertyId,
        title: buildTitle(row),
        description: row.descriptor ?? row.complaint_type ?? null,
        severity: mapSeverity(row.complaint_type ?? ''),
        status: mapStatus(row.status ?? ''),
        filed_date: row.created_date ? new Date(row.created_date).toISOString().split('T')[0] : null,
        closed_date: row.closed_date ? new Date(row.closed_date).toISOString().split('T')[0] : null,
        source_url: `https://portal.311.nyc.gov/sr-details/?srnum=${sourceId}`,
        raw_data: row,
      })
    }
    await batchUpsert(supabase, toInsert, result)

    offset += PAGE_SIZE
    if (rows.length < PAGE_SIZE) break
  }

  return result
}

function buildTitle(row: any): string {
  const type = row.complaint_type ?? 'Complaint'
  const desc = row.descriptor ? ` — ${row.descriptor}` : ''
  return `NYC 311: ${type}${desc}`.slice(0, 150)
}

function mapSeverity(type: string): string {
  const u = type.toLowerCase()
  if (u.includes('heat') || u.includes('lead') || u.includes('asbestos') ||
      u.includes('carbon monoxide') || u.includes('mold') || u.includes('rodent')) return 'high'
  if (u.includes('paint') || u.includes('mold') || u.includes('pests') ||
      u.includes('water leak') || u.includes('electric')) return 'medium'
  return 'low'
}

function mapStatus(status: string): string {
  const u = status.toLowerCase()
  if (u.includes('closed') || u.includes('resolved')) return 'closed'
  if (u.includes('pending') || u.includes('open') || u.includes('in progress')) return 'open'
  return 'open'
}
