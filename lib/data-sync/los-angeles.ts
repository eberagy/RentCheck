/**
 * Los Angeles Housing Code Violations
 * Primary:  https://data.lacity.org/resource/4e8r-s3wi.json  (LAHD Code Cases)
 * Fallback: https://data.lacity.org/resource/nabm-6xi6.json  (LAHD Building Permits)
 * Both are Socrata SODA APIs on the LA Open Data portal.
 * Endpoint IDs may change — add LA_LAHD_DATASET env var to override.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveProperty, normalizeAddress, type SyncResult } from './utils'

const ENDPOINTS = [
  process.env.LA_LAHD_DATASET ? `https://data.lacity.org/resource/${process.env.LA_LAHD_DATASET}.json` : null,
  'https://data.lacity.org/resource/4e8r-s3wi.json',   // LAHD Code Cases
  'https://data.lacity.org/resource/nabm-6xi6.json',   // LAHD Permits
  'https://data.lacity.org/resource/nuei-prcm.json',   // Code Enforcement alternate
].filter(Boolean) as string[]

const PAGE_SIZE = 1000

export async function syncLosAngeles(supabase: SupabaseClient): Promise<SyncResult> {
  const result: SyncResult = { added: 0, updated: 0, skipped: 0, errors: [] }

  const since = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

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
    result.errors.push('No working LA endpoint found — all endpoints unavailable. Set LA_LAHD_DATASET env var with a valid Socrata dataset ID from data.lacity.org.')
    return result
  }

  let offset = 0
  // Try common date fields
  const DATE_FIELDS = ['date_filed', 'date_initiated', 'date_opened', 'permit_date', 'created_date']

  while (true) {
    // Try to find which date field works (first iteration only)
    let url = `${workingEndpoint}?$limit=${PAGE_SIZE}&$offset=${offset}&$order=:id`
    try {
      // Use a broad time filter if we can find the right date field
      url = `${workingEndpoint}?$limit=${PAGE_SIZE}&$offset=${offset}&$where=:created_at>'${since}'&$order=:id`
    } catch { /* use fallback url */ }

    let rows: any[]
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
      if (!res.ok) { result.errors.push(`HTTP ${res.status} from LA API`); break }
      rows = await res.json()
      if (!Array.isArray(rows)) { result.errors.push('Unexpected LA API response'); break }
    } catch (e) {
      result.errors.push(e instanceof Error ? e.message : String(e)); break
    }
    if (rows.length === 0) break

    for (const row of rows) {
      try {
        const sourceId = String(
          row.case_number ?? row.permit_number ?? row.case_id ?? row.id ?? row.parcel_number ?? ''
        )
        if (!sourceId) { result.skipped++; continue }

        const addr = row.full_address ?? row.address ?? row.property_address ?? row.location ?? ''
        const addrNorm = normalizeAddress(addr)

        let propertyId = await resolveProperty(supabase, addrNorm, 'Los Angeles', 'CA')
        if (!propertyId && addr) {
          const { data: newProp } = await supabase
            .from('properties')
            .insert({
              address_line1: addr,
              city: 'Los Angeles',
              state: 'California',
              state_abbr: 'CA',
              zip: row.zip ?? row.zip_code ?? '',
              address_normalized: addrNorm,
            })
            .select('id').single()
          propertyId = newProp?.id ?? null
        }

        const filedDate =
          row.date_filed ?? row.date_initiated ?? row.date_opened ?? row.permit_date ?? null

        const { error } = await supabase.from('public_records').upsert({
          source: 'la_lahd',
          source_id: sourceId,
          record_type: 'la_violation',
          property_id: propertyId,
          title: buildLaTitle(row),
          description: row.violation_description ?? row.case_type ?? row.permit_type ?? null,
          severity: mapLaSeverity(row.priority ?? row.case_type),
          status: mapLaStatus(row.case_status ?? row.status ?? row.permit_status),
          filed_date: filedDate ? new Date(filedDate).toISOString().split('T')[0] : null,
          source_url: 'https://housing.lacity.gov',
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

function buildLaTitle(row: any): string {
  const label =
    row.violation_description ??
    row.case_type ??
    row.permit_type ??
    row.description ??
    'Code Violation'
  return `Los Angeles: ${label}`.slice(0, 150)
}

function mapLaSeverity(val: string | null | undefined): string {
  if (!val) return 'medium'
  const v = val.toLowerCase()
  if (v.includes('high') || v.includes('immed') || v.includes('hazard') || v.includes('emer')) return 'high'
  if (v.includes('critical')) return 'critical'
  if (v.includes('low') || v.includes('minor')) return 'low'
  return 'medium'
}

function mapLaStatus(val: string | null | undefined): string {
  if (!val) return 'open'
  const v = val.toLowerCase()
  if (v.includes('close') || v.includes('complet') || v.includes('final')) return 'closed'
  if (v.includes('dismiss') || v.includes('withdraw')) return 'dismissed'
  return 'open'
}
