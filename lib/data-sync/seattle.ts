/**
 * Seattle SDCI Code Violations
 * Uses Socrata catalog discovery + known dataset IDs
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeAddress, batchUpsert, withRetry, type SyncResult } from './utils'

const DOMAIN = 'data.seattle.gov'
const KNOWN_IDS = [
  process.env.SEATTLE_DATASET,
  'uyyd-8gak',  // Seattle Real Property data
  'kzjm-xkqj',  // Active Rental Registrations
  'p8p5-ust6',  // Building Inspections
  'k2p3-jnbc',
  'v74d-5n7a',
  'mags-97de',
].filter(Boolean) as string[]

const PAGE_SIZE = 1000

async function findWorkingEndpoint(): Promise<string | null> {
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
  try {
    const cat = await fetch(
      `https://api.us.socrata.com/api/catalog/v1?domains=${DOMAIN}&q=code+violation+rental&limit=5&only=datasets`,
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

export async function syncSeattle(supabase: SupabaseClient): Promise<SyncResult> {
  const result: SyncResult = { added: 0, updated: 0, skipped: 0, errors: [] }

  const endpoint = await findWorkingEndpoint()
  if (!endpoint) {
    result.errors.push('No working Seattle endpoint. Set SEATTLE_DATASET env var from data.seattle.gov.')
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
      const addr = row.property_address ?? row.address ?? row.original_address_1 ?? row.site_address ?? ''
      if (addr) uniqueAddrs.set(normalizeAddress(addr), addr)
    }
    const propRows = Array.from(uniqueAddrs.entries()).map(([norm, addr]) => ({
      address_line1: addr, city: 'Seattle', state: 'Washington', state_abbr: 'WA', zip: '', address_normalized: norm,
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
          .eq('state_abbr', 'WA')
        for (const p of existing ?? []) if (p.address_normalized) propIdMap.set(p.address_normalized, p.id)
      }
    }

    const toInsert: Record<string, unknown>[] = []
    for (const row of rows) {
      const sourceId = String(row.case_number ?? row.permit_number ?? row.application_permit_number ?? row.object_id ?? row.id ?? '')
      if (!sourceId) { result.skipped++; continue }
      const addr = row.property_address ?? row.address ?? row.original_address_1 ?? ''
      const propertyId = addr ? (propIdMap.get(normalizeAddress(addr)) ?? null) : null
      const desc = row.description ?? row.complaint_type ?? row.permit_type ?? row.action_type ?? null
      toInsert.push({
        source: 'seattle_sdci', source_id: sourceId, record_type: 'seattle_violation',
        property_id: propertyId,
        title: `Seattle: ${desc ?? 'Housing Violation'}`.slice(0, 150),
        description: desc, severity: 'medium',
        status: (row.status ?? '').toLowerCase().includes('close') ? 'closed' : 'open',
        filed_date: (row.original_file_date ?? row.application_date ?? row.issue_date ?? row.date)
          ? new Date(row.original_file_date ?? row.application_date ?? row.issue_date ?? row.date).toISOString().split('T')[0]
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
