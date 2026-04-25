/**
 * Boston Inspectional Services Violations
 * API: https://data.boston.gov/api/3/action/datastore_search (CKAN)
 * Tries multiple known resource IDs in order.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveProperty, normalizeAddress, type SyncResult } from './utils'

const ENDPOINT = 'https://data.boston.gov/api/3/action/datastore_search'
// Try multiple known resource IDs — Analyze Boston may rotate these.
// Verified working as of 2026-04-25: 800a2663-1d6a-46e7-9356-bedb70f5332c
// (Building and Property Violations).
const RESOURCE_IDS = [
  process.env.BOSTON_RESOURCE_ID,
  '800a2663-1d6a-46e7-9356-bedb70f5332c', // Building and Property Violations (current)
  'wc8w-nujj',   // ISD Property Violations (legacy)
  'ug4g-cbe8',   // Building and Property Violations (legacy)
  'uzih-pxpv',   // Property Violations alternate (legacy)
  '90ed3816-5e70-443c-803d-9a71f6a7a77f', // legacy
].filter(Boolean) as string[]

const PAGE_SIZE = 1000

export async function syncBoston(supabase: SupabaseClient): Promise<SyncResult> {
  const result: SyncResult = { added: 0, updated: 0, skipped: 0, errors: [] }

  // Find a working resource ID
  let workingResourceId: string | null = null
  for (const id of RESOURCE_IDS) {
    try {
      const probe = await fetch(`${ENDPOINT}?resource_id=${id}&limit=1`, {
        signal: AbortSignal.timeout(8000),
      })
      if (probe.ok) {
        const json = await probe.json()
        if (json.success && Array.isArray(json.result?.records)) {
          workingResourceId = id
          break
        }
      }
    } catch { /* try next */ }
  }

  if (!workingResourceId) {
    result.errors.push(
      'No working Boston ISD resource ID found. Go to data.boston.gov, search "property violations", ' +
      'click the dataset, copy the resource_id from the URL, and set BOSTON_RESOURCE_ID env var.'
    )
    return result
  }

  let offset = 0

  while (true) {
    const url = `${ENDPOINT}?resource_id=${workingResourceId}&limit=${PAGE_SIZE}&offset=${offset}`
    let rows: any[]
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
      if (!res.ok) { result.errors.push(`HTTP ${res.status}`); break }
      const json = await res.json()
      rows = json.result?.records ?? []
    } catch (e) {
      result.errors.push(e instanceof Error ? e.message : String(e)); break
    }
    if (rows.length === 0) break

    for (const row of rows) {
      try {
        const sourceId = String(row.case_no ?? row.sam_id ?? row.case_number ?? row._id ?? '')
        if (!sourceId) { result.skipped++; continue }

        // Modern dataset fields: violation_stno + violation_street (+ suffix).
        // Legacy resources used `address` / `stno`. Try both shapes.
        const modernStreet = [row.violation_stno, row.violation_street, row.violation_suffix]
          .map((s: unknown) => (typeof s === 'string' ? s.trim() : ''))
          .filter(Boolean)
          .join(' ')
        const street = modernStreet || row.address || row.stno || row.contact_addr1 || ''
        const cityName = row.violation_city || 'Boston'
        const zip = row.violation_zip || row.zip || ''
        const addrNorm = normalizeAddress(street)

        let propertyId = await resolveProperty(supabase, addrNorm, cityName, 'MA')
        if (!propertyId && street) {
          const { data: newProp } = await supabase
            .from('properties')
            .insert({ address_line1: street, city: cityName, state: 'Massachusetts', state_abbr: 'MA', zip, address_normalized: addrNorm })
            .select('id').single()
          propertyId = newProp?.id ?? null
        }

        let filedDate: string | null = null
        const dateRaw = row.status_dttm ?? row.open_dt
        if (dateRaw) {
          const d = new Date(dateRaw)
          if (!isNaN(d.getTime())) filedDate = d.toISOString().split('T')[0] ?? null
        }

        const { error } = await supabase.from('public_records').upsert({
          source: 'boston_isd',
          source_id: sourceId,
          record_type: 'boston_violation',
          property_id: propertyId,
          title: buildBostonTitle(row.description, row.code_description ?? row.code, row.status),
          description: row.description ?? row.code_description ?? row.code ?? null,
          severity: 'medium',
          status: row.status?.toLowerCase().includes('close') ? 'closed' : 'open',
          filed_date: filedDate,
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
    if (offset > 50000) break
  }

  return result
}

function buildBostonTitle(description: string | null, codeDescription: string | null, status: string | null): string {
  const label = [description, codeDescription, status].find(Boolean) ?? 'Inspectional Services Violation'
  return `Boston Violation: ${label}`.slice(0, 150)
}
