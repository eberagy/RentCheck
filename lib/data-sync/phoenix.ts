/**
 * Phoenix, AZ — Code Enforcement Cases
 * API: https://data.phoenix.gov (Socrata)
 * Dataset: wkdj-m5d4 (Code Enforcement Cases)
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeAddress, batchUpsert, upsertPropertiesAndMap, type SyncResult } from './utils'

const ENDPOINTS = [
  'https://data.phoenix.gov/resource/wkdj-m5d4.json', // Code Enforcement Cases
  'https://data.phoenix.gov/resource/9pf7-xxqe.json',  // Building Permits
]
const PAGE_SIZE = 1000

export async function syncPhoenix(supabase: SupabaseClient): Promise<SyncResult> {
  const result: SyncResult = { added: 0, updated: 0, skipped: 0, errors: [] }

  let workingEndpoint: string | null = null
  for (const ep of ENDPOINTS) {
    try {
      const probe = await fetch(`${ep}?$limit=1`, { signal: AbortSignal.timeout(8000) })
      if (probe.ok) {
        const rows = await probe.json()
        if (Array.isArray(rows)) { workingEndpoint = ep; break }
      }
    } catch { /* try next */ }
  }

  if (!workingEndpoint) {
    result.errors.push('No working Phoenix endpoint found. Browse data.phoenix.gov for code enforcement datasets and set PHOENIX_DATA_TOKEN env var.')
    return result
  }

  let offset = 0
  while (true) {
    const url = `${workingEndpoint}?$limit=${PAGE_SIZE}&$offset=${offset}&$order=:id`
    let rows: any[]
    try {
      const res = await fetch(url, {
        headers: { 'X-App-Token': process.env.PHOENIX_DATA_TOKEN ?? '' },
        signal: AbortSignal.timeout(30000),
      })
      if (!res.ok) { result.errors.push(`HTTP ${res.status}`); break }
      rows = await res.json()
    } catch (e) {
      result.errors.push(e instanceof Error ? e.message : String(e)); break
    }
    if (rows.length === 0) break

    const uniqueAddrs = new Map<string, { addr: string; zip: string }>()
    for (const row of rows) {
      const addr = ([row.address, row.street_address, row.location_address].find(Boolean) ?? '').trim()
      if (!addr) continue
      const norm = normalizeAddress(addr)
      if (norm && !uniqueAddrs.has(norm)) uniqueAddrs.set(norm, { addr, zip: row.zip_code ?? '' })
    }
    const propRows = Array.from(uniqueAddrs.entries()).map(([norm, v]) => ({
      address_line1: v.addr, city: 'Phoenix', state: 'Arizona',
      state_abbr: 'AZ', zip: v.zip, address_normalized: norm,
    }))
    const propIdMap = await upsertPropertiesAndMap(supabase, propRows, result)

    const toInsert: Record<string, unknown>[] = []
    for (const row of rows) {
      const sourceId = String(row.case_number ?? row.id ?? '')
      if (!sourceId) { result.skipped++; continue }
      const addr = [row.address, row.street_address, row.location_address].find(Boolean) ?? ''
      const propertyId = addr ? (propIdMap.get(normalizeAddress(addr)) ?? null) : null
      toInsert.push({
        source: 'phoenix_code',
        source_id: sourceId,
        record_type: 'phoenix_violation',
        property_id: propertyId,
        title: buildTitle(row),
        description: row.case_type ?? row.violation_description ?? row.complaint_type ?? null,
        severity: mapSeverity(row.priority ?? row.violation_class),
        status: mapStatus(row.case_status ?? row.status),
        filed_date: row.case_opened_date ? new Date(row.case_opened_date).toISOString().split('T')[0] : null,
        source_url: `https://www.phoenix.gov/pdd/code-enforcement`,
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
  const t = row.case_type ?? row.violation_description ?? row.complaint_type ?? 'Code Violation'
  return `Phoenix: ${t}`.slice(0, 150)
}
function mapSeverity(v: string | null): string {
  if (!v) return 'medium'
  const u = v.toLowerCase()
  if (u.includes('critical') || u.includes('immediate') || u.includes('high')) return 'high'
  if (u.includes('low') || u.includes('minor')) return 'low'
  return 'medium'
}
function mapStatus(v: string | null): string {
  if (!v) return 'open'
  const u = v.toLowerCase()
  if (u.includes('closed') || u.includes('resolved') || u.includes('compli')) return 'closed'
  if (u.includes('dismiss')) return 'dismissed'
  return 'open'
}
