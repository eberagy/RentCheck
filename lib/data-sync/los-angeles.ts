/**
 * Los Angeles Housing Dept (LAHD) Code Violations
 * API: https://data.lacity.org/resource/tisq-r6w4.json (Socrata)
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveProperty, normalizeAddress, type SyncResult } from './utils'

const ENDPOINT = 'https://data.lacity.org/resource/tisq-r6w4.json'
const PAGE_SIZE = 1000

export async function syncLosAngeles(supabase: SupabaseClient): Promise<SyncResult> {
  const result: SyncResult = { added: 0, updated: 0, skipped: 0, errors: [] }

  const since = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  let offset = 0

  while (true) {
    const url = `${ENDPOINT}?$where=date_filed>'${since}'&$limit=${PAGE_SIZE}&$offset=${offset}&$order=case_number`
    const res = await fetch(url)
    if (!res.ok) { result.errors.push(`HTTP ${res.status}`); break }

    const rows: any[] = await res.json()
    if (rows.length === 0) break

    for (const row of rows) {
      try {
        const sourceId = String(row.case_number ?? '')
        if (!sourceId) { result.skipped++; continue }

        const addr = row.full_address ?? row.address ?? ''
        const addrNorm = normalizeAddress(addr)

        let propertyId = await resolveProperty(supabase, addrNorm, 'Los Angeles', 'CA')
        if (!propertyId && addr) {
          const { data: newProp } = await supabase
            .from('properties')
            .insert({ address_line1: addr, city: 'Los Angeles', state: 'California', state_abbr: 'CA', zip: row.zip ?? '', address_normalized: addrNorm })
            .select('id').single()
          propertyId = newProp?.id ?? null
        }

        const { error } = await supabase.from('public_records').upsert({
          source: 'la_lahd',
          source_id: sourceId,
          record_type: 'la_violation',
          property_id: propertyId,
          title: buildLaTitle(row.violation_description, row.case_type, row.case_status),
          description: row.violation_description ?? row.case_type ?? null,
          severity: 'medium',
          status: row.case_status?.toLowerCase().includes('close') ? 'closed' : 'open',
          filed_date: row.date_filed ? new Date(row.date_filed).toISOString().split('T')[0] : null,
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

function buildLaTitle(description: string | null, caseType: string | null, status: string | null): string {
  const label = [description, caseType, status].find(Boolean) ?? 'Code Violation'
  return `Los Angeles Violation: ${label}`.slice(0, 150)
}
