/**
 * Pittsburgh PLI/DOMI/ES Violations Report
 * API: https://data.wprdc.org/api/3/action/datastore_search_sql
 * Dataset: https://data.wprdc.org/dataset/pittsburgh-pli-violations-report
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeAddress, batchUpsert, upsertPropertiesAndMap, type SyncResult } from './utils'

const ENDPOINT = 'https://data.wprdc.org/api/3/action/datastore_search_sql'
const RESOURCE_ID = '70c06278-92c5-4040-ab28-17671866f81c'
const PAGE_SIZE = 500

type PittsburghRow = {
  casefile_number: string | null
  address: string | null
  status: string | null
  case_file_type: string | null
  investigation_date: string | null
  investigation_outcome: string | null
  investigation_findings: string | null
  violation_description: string | null
  violation_code_section_title: string | null
  docket_number: string | null
  court_decision: string | null
}

export async function syncPittsburgh(supabase: SupabaseClient): Promise<SyncResult> {
  const result: SyncResult = { added: 0, updated: 0, skipped: 0, errors: [] }
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  let offset = 0

  while (true) {
    const sql = `
      SELECT casefile_number, address, status, case_file_type, investigation_date,
             investigation_outcome, investigation_findings, violation_description,
             violation_code_section_title, docket_number, court_decision
      FROM "${RESOURCE_ID}"
      WHERE investigation_date >= '${since}'
        AND address IS NOT NULL
      ORDER BY investigation_date DESC, casefile_number
      LIMIT ${PAGE_SIZE} OFFSET ${offset}
    `.trim()

    const res = await fetch(`${ENDPOINT}?sql=${encodeURIComponent(sql)}`)
    if (!res.ok) {
      result.errors.push(`HTTP ${res.status}: ${await res.text()}`)
      break
    }

    const json: { result?: { records?: PittsburghRow[] } } = await res.json()
    const rows = json.result?.records ?? []
    if (rows.length === 0) break

    // Batch property resolution per page.
    const uniqueAddrs = new Map<string, { addr: string; zip: string }>()
    for (const row of rows) {
      if (!row.address) continue
      const addressLine1 = extractStreetAddress(row.address)
      if (!addressLine1) continue
      const norm = normalizeAddress(addressLine1)
      if (norm && !uniqueAddrs.has(norm)) uniqueAddrs.set(norm, { addr: addressLine1, zip: extractZip(row.address) })
    }
    const propRows = Array.from(uniqueAddrs.entries()).map(([norm, v]) => ({
      address_line1: v.addr, city: 'Pittsburgh', state: 'Pennsylvania',
      state_abbr: 'PA', zip: v.zip, address_normalized: norm,
    }))
    const propIdMap = await upsertPropertiesAndMap(supabase, propRows, result)

    const toInsert: Record<string, unknown>[] = []
    for (const row of rows) {
      if (!row.casefile_number || !row.address) { result.skipped++; continue }
      const addressLine1 = extractStreetAddress(row.address)
      if (!addressLine1) { result.skipped++; continue }
      const propertyId = propIdMap.get(normalizeAddress(addressLine1)) ?? null
      const sourceId = [
        row.casefile_number,
        row.investigation_date ?? 'unknown-date',
        row.status ?? 'unknown-status',
        row.violation_code_section_title ?? row.violation_description ?? row.investigation_findings ?? 'record',
      ].join(':')
      toInsert.push({
        source: 'pittsburgh_pli',
        source_id: sourceId,
        source_url: 'https://data.wprdc.org/dataset/pittsburgh-pli-violations-report',
        record_type: 'pittsburgh_violation',
        property_id: propertyId,
        title: buildPittsburghTitle(row),
        description: [
          row.case_file_type,
          row.violation_description,
          row.violation_code_section_title,
          row.investigation_findings,
          row.investigation_outcome,
          row.court_decision,
        ].filter(Boolean).join(' — ') || null,
        severity: inferPittsburghSeverity(row.status, row.investigation_outcome),
        status: normalizePittsburghStatus(row.status),
        case_number: row.casefile_number,
        filed_date: row.investigation_date ?? null,
        outcome: row.court_decision ?? row.investigation_outcome ?? null,
        raw_data: row,
      })
    }
    await batchUpsert(supabase, toInsert, result)

    offset += PAGE_SIZE
    if (rows.length < PAGE_SIZE) break
  }

  return result
}

function extractStreetAddress(address: string) {
  return address.split(',')[0]?.trim() ?? ''
}

function extractZip(address: string) {
  const match = address.match(/\b(\d{5})(?:-\d{4})?\b/)
  return match?.[1] ?? ''
}

function normalizePittsburghStatus(status: string | null) {
  const value = status?.toLowerCase() ?? ''
  if (!value) return 'open'
  if (value.includes('close') || value.includes('compliance')) return 'closed'
  if (value.includes('dismiss')) return 'dismissed'
  return 'open'
}

function inferPittsburghSeverity(status: string | null, outcome: string | null) {
  const haystack = `${status ?? ''} ${outcome ?? ''}`.toLowerCase()
  if (haystack.includes('court')) return 'high'
  if (haystack.includes('violation')) return 'medium'
  if (haystack.includes('close')) return 'low'
  return 'medium'
}

function buildPittsburghTitle(row: PittsburghRow) {
  const label =
    row.violation_code_section_title ??
    row.violation_description ??
    row.case_file_type ??
    row.status ??
    'Property violation'

  return `Pittsburgh Violation: ${label}`.slice(0, 150)
}
