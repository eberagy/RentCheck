/**
 * Dallas Code Enforcement
 * Uses Socrata catalog discovery to find the correct dataset dynamically.
 * Verified dataset: Dallas 311 Service Requests (includes code enforcement cases)
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeAddress, batchUpsert, withRetry, type SyncResult } from './utils'

const DOMAIN = 'www.dallasopendata.com'
const KNOWN_IDS = [
  process.env.DALLAS_DATASET,
  'v6j2-4g6d',  // Dallas 311 Service Requests
  'jp2b-96m6',  // Building Inspections
  'tbnj-w5hb',  // Code Enforcement Cases
  'g2y9-9w4f',  // Code violation cases
  'btjx-b6m6',  // 311 requests alt
].filter(Boolean) as string[]

const PAGE_SIZE = 1000

async function findWorkingEndpoint(): Promise<string | null> {
  // Try known IDs first
  for (const id of KNOWN_IDS) {
    const ep = `https://${DOMAIN}/resource/${id}.json`
    try {
      const res = await withRetry(() => fetch(`${ep}?$limit=1`, { signal: AbortSignal.timeout(8000) }))
      if (res.ok) {
        const rows = await res.json()
        if (Array.isArray(rows)) return ep
      }
    } catch { /* try next */ }
  }
  // Socrata catalog discovery
  try {
    const cat = await fetch(
      `https://api.us.socrata.com/api/catalog/v1?domains=${DOMAIN}&q=code+enforcement+violation&limit=5&only=datasets`,
      { signal: AbortSignal.timeout(10000) }
    )
    if (cat.ok) {
      const { results } = await cat.json()
      for (const r of results ?? []) {
        const id = r.resource?.id
        if (!id) continue
        const ep = `https://${DOMAIN}/resource/${id}.json`
        try {
          const probe = await fetch(`${ep}?$limit=1`, { signal: AbortSignal.timeout(6000) })
          if (probe.ok) { const rows = await probe.json(); if (Array.isArray(rows)) return ep }
        } catch { /* try next */ }
      }
    }
  } catch { /* catalog unavailable */ }
  return null
}

export async function syncDallas(supabase: SupabaseClient): Promise<SyncResult> {
  const result: SyncResult = { added: 0, updated: 0, skipped: 0, errors: [] }

  const endpoint = await findWorkingEndpoint()
  if (!endpoint) {
    result.errors.push('No working Dallas endpoint. Set DALLAS_DATASET env var with a Socrata dataset ID from dallasopendata.com.')
    return result
  }

  let offset = 0
  while (true) {
    const url = `${endpoint}?$limit=${PAGE_SIZE}&$offset=${offset}&$order=:id`
    let rows: any[]
    try {
      const res = await withRetry(() => fetch(url, { signal: AbortSignal.timeout(15000) }))
      if (!res.ok) { result.errors.push(`HTTP ${res.status}`); break }
      rows = await res.json()
      if (!Array.isArray(rows)) break
    } catch (e) { result.errors.push(e instanceof Error ? e.message : String(e)); break }
    if (!rows.length) break

    const uniqueAddrs = new Map<string, string>()
    for (const row of rows) {
      const addr = row.address ?? row.property_address ?? row.location_address ?? row.address1 ?? ''
      if (addr) uniqueAddrs.set(normalizeAddress(addr), addr)
    }
    const propRows = Array.from(uniqueAddrs.entries()).map(([norm, addr]) => ({
      address_line1: addr, city: 'Dallas', state: 'Texas', state_abbr: 'TX', zip: '', address_normalized: norm,
    }))
    const propIdMap = new Map<string, string>()
    for (let i = 0; i < propRows.length; i += 200) {
      const slice = propRows.slice(i, i + 200)
      const { data } = await supabase.from('properties')
        .upsert(slice, { onConflict: 'address_normalized,city,state_abbr', ignoreDuplicates: true })
        .select('id, address_normalized')
      for (const p of data ?? []) if (p.address_normalized) propIdMap.set(p.address_normalized, p.id)
      const missing = slice
        .map(r => r.address_normalized)
        .filter((norm): norm is string => typeof norm === 'string' && !propIdMap.has(norm))
      if (missing.length) {
        const { data: existing } = await supabase.from('properties')
          .select('id, address_normalized')
          .in('address_normalized', missing)
          .eq('state_abbr', 'TX')
        for (const p of existing ?? []) if (p.address_normalized) propIdMap.set(p.address_normalized, p.id)
      }
    }

    const toInsert: Record<string, unknown>[] = []
    for (const row of rows) {
      const sourceId = String(row.case_number ?? row.service_request_id ?? row.sr_number ?? row.id ?? '')
      if (!sourceId) { result.skipped++; continue }
      const addr = row.address ?? row.property_address ?? row.location_address ?? row.address1 ?? ''
      const propertyId = addr ? (propIdMap.get(normalizeAddress(addr)) ?? null) : null
      const desc = row.case_type ?? row.description ?? row.service_name ?? row.type_of_service_request ?? null
      toInsert.push({
        source: 'dallas_code', source_id: sourceId, record_type: 'dallas_violation',
        property_id: propertyId,
        title: `Dallas: ${desc ?? 'Code Violation'}`.slice(0, 150),
        description: desc,
        severity: 'medium',
        status: (row.status ?? row.case_status ?? '').toLowerCase().includes('close') ? 'closed' : 'open',
        filed_date: (row.date_filed ?? row.date_opened ?? row.creation_date ?? row.open_dt)
          ? new Date(row.date_filed ?? row.date_opened ?? row.creation_date ?? row.open_dt).toISOString().split('T')[0]
          : null,
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
