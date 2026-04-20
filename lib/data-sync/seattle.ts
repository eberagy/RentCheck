/**
 * Seattle Rental Housing Code Violations
 * Portal: https://data.seattle.gov (Socrata)
 * Tries multiple known SDCI dataset IDs.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveProperty, normalizeAddress, type SyncResult } from './utils'

const BASE_DOMAIN = 'https://data.seattle.gov'
const DATASET_IDS = [
  process.env.SEATTLE_DATASET,
  'k2p3-jnbc',   // SDCI Permit Applications
  'v74d-5n7a',   // SDCI Code Violations
  'jtgu-b86t',   // SDCI Rental Housing (legacy)
  'j9km-ydkc',   // Building Permits alternate
  'mags-97de',   // Code Enforcement Cases
].filter(Boolean) as string[]

const PAGE_SIZE = 1000

export async function syncSeattle(supabase: SupabaseClient): Promise<SyncResult> {
  const result: SyncResult = { added: 0, updated: 0, skipped: 0, errors: [] }

  let workingEndpoint: string | null = null
  for (const id of DATASET_IDS) {
    const ep = `${BASE_DOMAIN}/resource/${id}.json`
    try {
      const probe = await fetch(`${ep}?$limit=1`, { signal: AbortSignal.timeout(8000) })
      if (probe.ok) {
        const rows = await probe.json()
        if (Array.isArray(rows) && rows.length > 0) { workingEndpoint = ep; break }
      }
    } catch { /* try next */ }
  }

  if (!workingEndpoint) {
    result.errors.push(
      'No working Seattle dataset found. Go to data.seattle.gov, search "code violations" or "SDCI", ' +
      'copy the 4x4 dataset ID, and set SEATTLE_DATASET env var.'
    )
    return result
  }

  let offset = 0

  while (true) {
    const url = `${workingEndpoint}?$limit=${PAGE_SIZE}&$offset=${offset}&$order=:id`
    let rows: any[]
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
      if (!res.ok) { result.errors.push(`HTTP ${res.status}`); break }
      rows = await res.json()
      if (!Array.isArray(rows)) break
    } catch (e) {
      result.errors.push(e instanceof Error ? e.message : String(e)); break
    }
    if (rows.length === 0) break

    for (const row of rows) {
      try {
        const sourceId = String(row.case_number ?? row.permit_number ?? row.application_permit_number ?? row.id ?? '')
        if (!sourceId) { result.skipped++; continue }

        const addr = row.property_address ?? row.address ?? row.original_address_1 ?? ''
        const addrNorm = normalizeAddress(addr)

        let propertyId = await resolveProperty(supabase, addrNorm, 'Seattle', 'WA')
        if (!propertyId && addr) {
          const { data: newProp } = await supabase
            .from('properties')
            .insert({ address_line1: addr, city: 'Seattle', state: 'Washington', state_abbr: 'WA', zip: row.zip ?? row.zip_code ?? '', address_normalized: addrNorm })
            .select('id').single()
          propertyId = newProp?.id ?? null
        }

        const { error } = await supabase.from('public_records').upsert({
          source: 'seattle_sdci',
          source_id: sourceId,
          record_type: 'seattle_violation',
          property_id: propertyId,
          title: buildSeattleTitle(row.description, row.complaint_type ?? row.permit_type ?? row.action_type, row.priority),
          description: row.description ?? row.complaint_type ?? row.permit_type ?? null,
          severity: row.priority ? mapPriority(row.priority) : 'medium',
          status: (row.status ?? '').toLowerCase().includes('close') ? 'closed' : 'open',
          filed_date: (row.original_file_date ?? row.application_date ?? row.issue_date)
            ? new Date(row.original_file_date ?? row.application_date ?? row.issue_date).toISOString().split('T')[0]
            : null,
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
    if (offset > 100000) break
  }

  return result
}

function mapPriority(p: string): string {
  const l = p.toLowerCase()
  if (l.includes('high') || l.includes('urgent') || l === '1') return 'high'
  if (l.includes('low') || l === '3') return 'low'
  return 'medium'
}

function buildSeattleTitle(description: string | null, type: string | null, priority: string | null): string {
  const label = [description, type, priority].find(Boolean) ?? 'Housing Violation'
  return `Seattle Violation: ${label}`.slice(0, 150)
}
