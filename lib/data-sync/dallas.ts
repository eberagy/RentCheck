/**
 * Dallas Code Enforcement Violations
 * Portal: https://www.dallasopendata.com (Socrata)
 * Dataset: Dallas Code Enforcement cases / building inspections
 * Set DALLAS_DATASET env var with Socrata 4x4 ID to override.
 * Known dataset IDs to try:
 *   g2y9-9w4f — Code violation cases
 *   jp2b-96m6 — Building inspections
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveProperty, normalizeAddress, type SyncResult } from './utils'

const BASE_DOMAIN = 'https://www.dallasopendata.com'
const DATASET_IDS = [
  process.env.DALLAS_DATASET,
  'g2y9-9w4f',
  'jp2b-96m6',
  '6r6f-bpnx',
  'uh68-sj9p',
].filter(Boolean) as string[]

const PAGE_SIZE = 1000

export async function syncDallas(supabase: SupabaseClient): Promise<SyncResult> {
  const result: SyncResult = { added: 0, updated: 0, skipped: 0, errors: [] }

  let workingEndpoint: string | null = null
  for (const id of DATASET_IDS) {
    const ep = `${BASE_DOMAIN}/resource/${id}.json`
    try {
      const probe = await fetch(`${ep}?$limit=1`, {
        headers: { 'X-App-Token': process.env.DALLAS_DATA_TOKEN ?? '' },
        signal: AbortSignal.timeout(8000),
      })
      if (probe.ok) {
        const rows = await probe.json()
        if (Array.isArray(rows)) { workingEndpoint = ep; break }
      }
    } catch { /* try next */ }
  }

  if (!workingEndpoint) {
    result.errors.push('No working Dallas endpoint found. Browse dallasopendata.com for code enforcement datasets, then set DALLAS_DATASET env var.')
    return result
  }

  let offset = 0
  while (true) {
    const url = `${workingEndpoint}?$limit=${PAGE_SIZE}&$offset=${offset}&$order=:id`
    let rows: any[]
    try {
      const res = await fetch(url, {
        headers: { 'X-App-Token': process.env.DALLAS_DATA_TOKEN ?? '' },
        signal: AbortSignal.timeout(15000),
      })
      if (!res.ok) { result.errors.push(`HTTP ${res.status} from Dallas API`); break }
      rows = await res.json()
      if (!Array.isArray(rows)) break
    } catch (e) {
      result.errors.push(e instanceof Error ? e.message : String(e)); break
    }
    if (rows.length === 0) break

    for (const row of rows) {
      try {
        const sourceId = String(row.case_number ?? row.id ?? row.permit_number ?? row.violation_id ?? '')
        if (!sourceId) { result.skipped++; continue }

        const addr = row.address ?? row.property_address ?? row.location ?? ''
        const addrNorm = normalizeAddress(addr)

        let propertyId = await resolveProperty(supabase, addrNorm, 'Dallas', 'TX')
        if (!propertyId && addr) {
          const { data: newProp } = await supabase
            .from('properties')
            .insert({
              address_line1: addr,
              city: 'Dallas',
              state: 'Texas',
              state_abbr: 'TX',
              zip: row.zip ?? row.zip_code ?? '',
              address_normalized: addrNorm,
            })
            .select('id').single()
          propertyId = newProp?.id ?? null
        }

        const { error } = await supabase.from('public_records').upsert({
          source: 'dallas_code',
          source_id: sourceId,
          record_type: 'dallas_violation',
          property_id: propertyId,
          title: `Dallas: ${row.case_type ?? row.violation_type ?? row.description ?? 'Code Violation'}`.slice(0, 150),
          description: row.description ?? row.case_type ?? row.violation_type ?? null,
          severity: 'medium',
          status: mapStatus(row.status ?? row.case_status),
          filed_date: (row.date_filed ?? row.date_opened ?? row.created_date)
            ? new Date(row.date_filed ?? row.date_opened ?? row.created_date).toISOString().split('T')[0]
            : null,
          source_url: 'https://www.dallasopendata.com',
          raw_data: row,
        }, { onConflict: 'source,source_id', ignoreDuplicates: false })

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

function mapStatus(val: string | null | undefined): string {
  if (!val) return 'open'
  const v = val.toLowerCase()
  if (v.includes('close') || v.includes('complet') || v.includes('resolv')) return 'closed'
  if (v.includes('pend')) return 'pending'
  return 'open'
}
