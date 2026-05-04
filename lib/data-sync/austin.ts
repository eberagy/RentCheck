/**
 * Austin Code Enforcement Complaints
 * Portal: https://data.austintexas.gov (Socrata)
 * Tries multiple known dataset IDs in order.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeAddress, batchUpsert, upsertPropertiesAndMap, type SocrataRow, type SyncResult } from './utils'

const BASE_DOMAIN = 'https://data.austintexas.gov'
const DATASET_IDS = [
  process.env.AUSTIN_DATASET,
  '6wtj-zbtb',   // Austin Code Complaint Cases — verified 2026-05-02 (82,984 rows)
  '3ntu-iuld',   // Austin Code Cases (legacy)
  'rvvd-esxg',   // alt legacy
  '99qw-4hup',   // alt legacy
  'i26j-ai4z',   // alt legacy
].filter(Boolean) as string[]

const PAGE_SIZE = 1000

export async function syncAustin(supabase: SupabaseClient): Promise<SyncResult> {
  const result: SyncResult = { added: 0, updated: 0, skipped: 0, errors: [] }

  let workingEndpoint: string | null = null
  for (const id of DATASET_IDS) {
    const ep = `${BASE_DOMAIN}/resource/${id}.json`
    try {
      const probe = await fetch(`${ep}?$limit=1`, { signal: AbortSignal.timeout(8000) })
      if (probe.ok) {
        const rows = await probe.json()
        if (Array.isArray(rows)) { workingEndpoint = ep; break }
      }
    } catch { /* try next */ }
  }

  if (!workingEndpoint) {
    result.errors.push(
      'No working Austin dataset found. Go to data.austintexas.gov, search "code complaints", ' +
      'copy the 4x4 dataset ID, and set AUSTIN_DATASET env var.'
    )
    return result
  }

  let offset = 0

  while (true) {
    const url = `${workingEndpoint}?$limit=${PAGE_SIZE}&$offset=${offset}&$order=:id`
    let rows: SocrataRow[]
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
      if (!res.ok) { result.errors.push(`HTTP ${res.status}`); break }
      rows = await res.json()
      if (!Array.isArray(rows)) break
    } catch (e) {
      result.errors.push(e instanceof Error ? e.message : String(e)); break
    }
    if (rows.length === 0) break

    // Batch-resolve properties first so we don't hit a per-row resolveProperty
    // round-trip — the row-by-row pattern was timing out the Vercel function
    // around 100k Austin rows (2026-05-03 cron auto-swept).
    const uniqueAddrs = new Map<string, { addr: string; zip: string }>()
    for (const row of rows) {
      const addr = (row.address ?? row.property_address ?? row.location_address ?? '').trim()
      if (!addr) continue
      const norm = normalizeAddress(addr)
      if (!uniqueAddrs.has(norm)) {
        uniqueAddrs.set(norm, { addr, zip: row.zip ?? row.zip_code ?? '' })
      }
    }
    const propRows = Array.from(uniqueAddrs.entries()).map(([norm, v]) => ({
      address_line1: v.addr, city: 'Austin', state: 'Texas',
      state_abbr: 'TX', zip: v.zip, address_normalized: norm,
    }))
    const propIdMap = await upsertPropertiesAndMap(supabase, propRows, result)

    const toInsert: Record<string, unknown>[] = []
    for (const row of rows) {
      const sourceId = String(row.case_id ?? row.id ?? row.complaint_id ?? '')
      if (!sourceId) { result.skipped++; continue }
      const addr = row.address ?? row.property_address ?? row.location_address ?? ''
      const propertyId = addr ? (propIdMap.get(normalizeAddress(addr)) ?? null) : null
      const filedRaw = row.opened_date ?? row.date_entered ?? row.open_date ?? row.created_date
      toInsert.push({
        source: 'austin_code',
        source_id: sourceId,
        record_type: 'austin_complaint',
        property_id: propertyId,
        title: buildAustinTitle(row.description, row.case_type, row.status_current ?? row.status),
        description: row.description ?? row.case_type ?? null,
        severity: 'medium',
        status: (row.status_current ?? row.status ?? '').toLowerCase().includes('close') ? 'closed' : 'open',
        filed_date: filedRaw ? new Date(filedRaw).toISOString().split('T')[0] : null,
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

function buildAustinTitle(description: string | null, caseType: string | null, status: string | null): string {
  const label = [description, caseType, status].find(Boolean) ?? 'Code Complaint'
  return `Austin Complaint: ${label}`.slice(0, 150)
}
