/**
 * Philadelphia Licenses & Inspections Violations
 * API: https://phl.carto.com/api/v2/sql (CartoDB — no token required)
 * Dataset: https://opendataphilly.org/datasets/licenses-and-inspections-code-violations
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeAddress, batchUpsert, upsertPropertiesAndMap, type SyncResult, type SocrataRow } from './utils'

const CARTO_ENDPOINT = 'https://phl.carto.com/api/v2/sql'
const PAGE_SIZE = 1000

export async function syncPhiladelphia(supabase: SupabaseClient): Promise<SyncResult> {
  const result: SyncResult = { added: 0, updated: 0, skipped: 0, errors: [] }

  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  let offset = 0

  while (true) {
    const sql = `
      SELECT casenumber, address, zip, violationdate, violationdescription,
             aptype, casestatus, prioritydesc
      FROM li_violations
      WHERE violationdate > '${since}'
      ORDER BY casenumber
      LIMIT ${PAGE_SIZE} OFFSET ${offset}
    `
    const url = `${CARTO_ENDPOINT}?q=${encodeURIComponent(sql)}`
    const res = await fetch(url, { signal: AbortSignal.timeout(30000) })
    if (!res.ok) { result.errors.push(`HTTP ${res.status}: ${await res.text()}`); break }

    const json: { rows: SocrataRow[] } = await res.json()
    const rows = json.rows ?? []
    if (rows.length === 0) break

    // Batch property resolution: same per-page pattern as nyc-hpd / boston.
    const uniqueAddrs = new Map<string, { addr: string; zip: string }>()
    for (const row of rows) {
      const addr = (row.address ?? '').trim()
      if (!addr) continue
      const norm = normalizeAddress(addr)
      if (norm && !uniqueAddrs.has(norm)) uniqueAddrs.set(norm, { addr, zip: row.zip ?? '' })
    }
    const propRows = Array.from(uniqueAddrs.entries()).map(([norm, v]) => ({
      address_line1: v.addr, city: 'Philadelphia', state: 'Pennsylvania',
      state_abbr: 'PA', zip: v.zip, address_normalized: norm,
    }))
    const propIdMap = await upsertPropertiesAndMap(supabase, propRows, result)

    const toInsert: Record<string, unknown>[] = []
    for (const row of rows) {
      const sourceId = String(row.casenumber ?? '')
      if (!sourceId) { result.skipped++; continue }
      const addr = row.address ?? ''
      const propertyId = addr ? (propIdMap.get(normalizeAddress(addr)) ?? null) : null
      toInsert.push({
        source: 'philadelphia',
        source_id: sourceId,
        record_type: 'philly_violation',
        property_id: propertyId,
        title: buildPhillyTitle(row.violationdescription, row.aptype, row.prioritydesc),
        description: row.aptype ?? null,
        severity: row.prioritydesc?.toLowerCase().includes('immed') ? 'high' : 'medium',
        status: row.casestatus?.toLowerCase().includes('close') ? 'closed' : 'open',
        filed_date: row.violationdate ? new Date(row.violationdate).toISOString().split('T')[0] : null,
        raw_data: row,
      })
    }
    await batchUpsert(supabase, toInsert, result)

    offset += PAGE_SIZE
    if (rows.length < PAGE_SIZE) break
  }

  return result
}

function buildPhillyTitle(description: string | null, caseType: string | null, priority: string | null): string {
  const label = [description, caseType, priority].find(Boolean) ?? 'L&I Violation'
  return `Philadelphia Violation: ${label}`.slice(0, 150)
}
