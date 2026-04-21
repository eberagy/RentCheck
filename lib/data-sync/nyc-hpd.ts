/**
 * NYC HPD Housing Violations Sync
 * API: https://data.cityofnewyork.us/resource/wvxf-dwi5.json (Socrata)
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveOrQueueLandlord, normalizeAddress, batchUpsert, type SyncResult } from './utils'

const ENDPOINT = 'https://data.cityofnewyork.us/resource/wvxf-dwi5.json'
const PAGE_SIZE = 1000

export async function syncNycHpd(supabase: SupabaseClient): Promise<SyncResult> {
  const result: SyncResult = { added: 0, updated: 0, skipped: 0, errors: [] }

  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  let offset = 0

  while (true) {
    const url = `${ENDPOINT}?$where=inspectiondate>'${since}'&$limit=${PAGE_SIZE}&$offset=${offset}&$order=violationid`
    let rows: any[]
    try {
      const res = await fetch(url, { headers: { 'X-App-Token': process.env.NYC_OPEN_DATA_TOKEN ?? '' } })
      if (!res.ok) { result.errors.push(`HTTP ${res.status}`); break }
      rows = await res.json()
    } catch (e) { result.errors.push(e instanceof Error ? e.message : String(e)); break }
    if (!rows.length) break

    // ── Batch-upsert properties ──────────────────────────────────────────────
    const uniqueAddrs = new Map<string, { addr: string; zip: string }>()
    for (const row of rows) {
      const addr = [row.housenumber, row.streetname].filter(Boolean).join(' ')
      if (addr) uniqueAddrs.set(normalizeAddress(addr), { addr, zip: row.postcode ?? '' })
    }
    const propRows = Array.from(uniqueAddrs.entries()).map(([norm, v]) => ({
      address_line1: v.addr, city: 'New York City', state: 'New York',
      state_abbr: 'NY', zip: v.zip, address_normalized: norm,
    }))
    const propertyMap = new Map<string, string>()
    for (let i = 0; i < propRows.length; i += 200) {
      const { data } = await supabase.from('properties')
        .upsert(propRows.slice(i, i + 200), { onConflict: 'address_normalized,city,state_abbr', ignoreDuplicates: true })
        .select('id, address_normalized')
      for (const p of data ?? []) if (p.address_normalized) propertyMap.set(p.address_normalized, p.id)
    }

    // ── Batch-upsert landlords ───────────────────────────────────────────────
    const landlordMap = new Map<string, string | null>()
    const uniqueOwners = Array.from(new Set(rows.map((r: any) => r.ownername).filter(Boolean)))
    for (const name of uniqueOwners) {
      landlordMap.set(name, await resolveOrQueueLandlord(supabase, name, 'New York City', 'NY'))
    }

    // ── Build record rows ────────────────────────────────────────────────────
    const toInsert: Record<string, unknown>[] = []
    for (const row of rows) {
      const sourceId = String(row.violationid ?? '')
      if (!sourceId) { result.skipped++; continue }
      const addr = [row.housenumber, row.streetname].filter(Boolean).join(' ')
      const propertyId = addr ? (propertyMap.get(normalizeAddress(addr)) ?? null) : null
      const landlordId = row.ownername ? (landlordMap.get(row.ownername) ?? null) : null
      toInsert.push({
        source: 'nyc_hpd', source_id: sourceId, record_type: 'hpd_violation',
        landlord_id: landlordId, property_id: propertyId,
        title: buildHpdTitle(row.class, row.novdescription),
        description: row.novdescription ?? row.class ?? null,
        severity: mapHpdClass(row.class), status: mapHpdStatus(row.currentstatus),
        filed_date: row.approveddate ? new Date(row.approveddate).toISOString().split('T')[0] : null,
        closed_date: row.closedate ? new Date(row.closedate).toISOString().split('T')[0] : null,
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

function buildHpdTitle(cls: string | null, description: string | null): string {
  const label = [cls ? `Class ${cls}` : null, description?.trim() ?? null].filter(Boolean).join(' - ')
  return `HPD Violation: ${label || 'Housing Violation'}`.slice(0, 150)
}
function mapHpdClass(c: string | null): string {
  if (!c) return 'unknown'
  const cl = c.toUpperCase()
  if (cl === 'A') return 'low'
  if (cl === 'B') return 'medium'
  if (cl === 'I' || cl === 'C') return 'high'
  return 'unknown'
}
function mapHpdStatus(s: string | null): string {
  if (!s) return 'unknown'
  const sl = s.toLowerCase()
  if (sl.includes('close') || sl.includes('dismiss')) return 'closed'
  if (sl.includes('open') || sl.includes('active')) return 'open'
  return s
}
