/**
 * NYC HPD Housing Violations Sync
 * API: https://data.cityofnewyork.us/resource/wvxf-dwi5.json (Socrata)
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeAddress, batchUpsert, upsertPropertiesAndMap, type SyncResult } from './utils'

const ENDPOINT = 'https://data.cityofnewyork.us/resource/wvxf-dwi5.json'
const PAGE_SIZE = 1000

export async function syncNycHpd(supabase: SupabaseClient): Promise<SyncResult> {
  const result: SyncResult = { added: 0, updated: 0, skipped: 0, errors: [] }

  // Tighter window (30 days) so the run finishes inside Vercel's 5-min ceiling.
  // Daily cron means we still capture every new violation.
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  let offset = 0

  while (true) {
    // Socrata $where must be URL-encoded — the `>` and `'` previously
    // returned HTTP 400 silently.
    const where = encodeURIComponent(`inspectiondate>'${since}'`)
    const url = `${ENDPOINT}?$where=${where}&$limit=${PAGE_SIZE}&$offset=${offset}&$order=violationid`
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
      // HPD dataset uses `zip` not `postcode`.
      if (addr) uniqueAddrs.set(normalizeAddress(addr), { addr, zip: row.zip ?? '' })
    }
    const propRows = Array.from(uniqueAddrs.entries()).map(([norm, v]) => ({
      address_line1: v.addr, city: 'New York City', state: 'New York',
      state_abbr: 'NY', zip: v.zip, address_normalized: norm,
    }))
    const propertyMap = await upsertPropertiesAndMap(supabase, propRows, result)

    // ── Build record rows (landlord linking done by mine-owners sync) ────────
    const toInsert: Record<string, unknown>[] = []
    for (const row of rows) {
      const sourceId = String(row.violationid ?? '')
      if (!sourceId) { result.skipped++; continue }
      const addr = [row.housenumber, row.streetname].filter(Boolean).join(' ')
      const propertyId = addr ? (propertyMap.get(normalizeAddress(addr)) ?? null) : null
      toInsert.push({
        source: 'nyc_hpd', source_id: sourceId, record_type: 'hpd_violation',
        property_id: propertyId,
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
