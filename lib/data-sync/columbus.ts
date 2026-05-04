/**
 * Columbus, OH — Code Enforcement Violations
 * API: https://opendata.columbus.gov (Socrata)
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeAddress, batchUpsert, upsertPropertiesAndMap, type SocrataRow, type SyncResult } from './utils'

const ENDPOINTS = [
  'https://opendata.columbus.gov/resource/5fbu-arth.json', // Code enforcement
  'https://opendata.columbus.gov/resource/w7td-azgy.json', // Nuisance abatement
  'https://opendata.columbus.gov/resource/jx8u-pf5h.json', // Building permits
]
const PAGE_SIZE = 1000

export async function syncColumbus(supabase: SupabaseClient): Promise<SyncResult> {
  const result: SyncResult = { added: 0, updated: 0, skipped: 0, errors: [] }

  let workingEndpoint: string | null = null
  for (const ep of ENDPOINTS) {
    try {
      const probe = await fetch(`${ep}?$limit=1`, { signal: AbortSignal.timeout(8000) })
      if (probe.ok) {
        const rows = await probe.json()
        if (Array.isArray(rows) && rows.length > 0) { workingEndpoint = ep; break }
      }
    } catch { /* try next */ }
  }

  if (!workingEndpoint) {
    result.errors.push('No working Columbus endpoint found')
    return result
  }

  let offset = 0
  while (true) {
    const url = `${workingEndpoint}?$limit=${PAGE_SIZE}&$offset=${offset}&$order=:id`
    let rows: SocrataRow[]
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(30000) })
      if (!res.ok) { result.errors.push(`HTTP ${res.status}`); break }
      rows = await res.json()
    } catch (e) {
      result.errors.push(e instanceof Error ? e.message : String(e)); break
    }
    if (rows.length === 0) break

    const uniqueAddrs = new Map<string, { addr: string; zip: string }>()
    for (const row of rows) {
      const addr = (row.address ?? row.site_address ?? row.property_address ?? '').trim()
      if (!addr) continue
      const norm = normalizeAddress(addr)
      if (norm && !uniqueAddrs.has(norm)) uniqueAddrs.set(norm, { addr, zip: row.zip ?? row.zip_code ?? '' })
    }
    const propRows = Array.from(uniqueAddrs.entries()).map(([norm, v]) => ({
      address_line1: v.addr, city: 'Columbus', state: 'Ohio',
      state_abbr: 'OH', zip: v.zip, address_normalized: norm,
    }))
    const propIdMap = await upsertPropertiesAndMap(supabase, propRows, result)

    const toInsert: Record<string, unknown>[] = []
    for (const row of rows) {
      const sourceId = String(row.case_number ?? row.casenumber ?? row.id ?? row.objectid ?? '')
      if (!sourceId) { result.skipped++; continue }
      const addr = row.address ?? row.site_address ?? row.property_address ?? ''
      const propertyId = addr ? (propIdMap.get(normalizeAddress(addr)) ?? null) : null
      const filedRaw = row.date_opened ?? row.violation_date
      toInsert.push({
        source: 'columbus_code',
        source_id: sourceId,
        record_type: 'columbus_violation',
        property_id: propertyId,
        title: buildTitle(row),
        description: row.violation_type ?? row.case_type ?? row.description ?? null,
        severity: mapSeverity(row.priority ?? row.violation_class),
        status: mapStatus(row.status ?? row.case_status),
        filed_date: filedRaw ? new Date(filedRaw).toISOString().split('T')[0] : null,
        source_url: 'https://www.columbus.gov/codemeetings/',
        raw_data: row,
      })
    }
    await batchUpsert(supabase, toInsert, result)

    offset += PAGE_SIZE
    if (rows.length < PAGE_SIZE) break
    if (offset > 100000) break
  }

  return result
}

function buildTitle(row: SocrataRow): string {
  const t = row.violation_type ?? row.case_type ?? row.description ?? 'Code Violation'
  return `Columbus: ${t}`.slice(0, 150)
}
function mapSeverity(v: string | null): string {
  if (!v) return 'medium'
  const u = v.toLowerCase()
  if (u.includes('high') || u.includes('immedi') || u.includes('critical')) return 'high'
  if (u.includes('low') || u.includes('minor') || u.includes('routine')) return 'low'
  return 'medium'
}
function mapStatus(v: string | null): string {
  if (!v) return 'open'
  const u = v.toLowerCase()
  if (u.includes('closed') || u.includes('compli') || u.includes('resolved')) return 'closed'
  if (u.includes('dismiss') || u.includes('void') || u.includes('abate')) return 'dismissed'
  return 'open'
}
