/**
 * New York State Department of State — Active Corporations
 * Source: data.ny.gov, dataset n9v6-gdje (Active Corporations: Beginning 1800)
 *
 * Public registry of every business entity formed or authorized to do
 * business in NY. We use it to enrich existing NY landlord profiles with:
 *   - DOS ID (a stable identifier per LLC)
 *   - Initial filing date (how long the entity has existed)
 *   - Entity type (Domestic LLC, Foreign LLC, Limited Partnership, etc.)
 *   - Registered agent + service-of-process address
 *   - County of formation
 *
 * Why it matters: renters can finally see the LLC's *actual* age,
 * jurisdiction, and registered agent. Brand-new shell LLCs that just
 * appeared 30 days ago get flagged as informational records on the
 * landlord profile.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { SyncResult } from './utils'

const ENDPOINT = 'https://data.ny.gov/resource/n9v6-gdje.json'
const PAGE_SIZE = 5000
const MAX_PAGES = 20 // 100k rows ceiling per run — NY has ~3M total but most won't match

// Only entity types likely to be landlords / property holders.
const RELEVANT_ENTITY_TYPES = new Set([
  'DOMESTIC LIMITED LIABILITY COMPANY',
  'FOREIGN LIMITED LIABILITY COMPANY',
  'DOMESTIC BUSINESS CORPORATION',
  'FOREIGN BUSINESS CORPORATION',
  'DOMESTIC LIMITED PARTNERSHIP',
  'FOREIGN LIMITED PARTNERSHIP',
])

type NyRow = {
  dos_id?: string
  current_entity_name?: string
  initial_dos_filing_date?: string
  entity_type?: string
  county?: string
  jurisdiction?: string
  dos_process_name?: string
  dos_process_address_1?: string
  dos_process_city?: string
  dos_process_state?: string
  dos_process_zip?: string
}

function toTitleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

function normalizeEntityName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ')
}

function buildTitle(row: NyRow): string {
  const type = (row.entity_type ?? '').replace('LIMITED LIABILITY COMPANY', 'LLC')
    .replace('BUSINESS CORPORATION', 'CORP')
    .replace('LIMITED PARTNERSHIP', 'LP')
  const filed = row.initial_dos_filing_date?.slice(0, 10) ?? '—'
  const base = `Registered as ${toTitleCase(type)} in NY (DOS) — filed ${filed}`
  return base.slice(0, 150)
}

function buildDescription(row: NyRow): string {
  const lines: string[] = []
  if (row.dos_id) lines.push(`DOS ID: ${row.dos_id}`)
  if (row.entity_type) lines.push(`Type: ${toTitleCase(row.entity_type)}`)
  if (row.jurisdiction) lines.push(`Jurisdiction: ${toTitleCase(row.jurisdiction)}`)
  if (row.county) lines.push(`County: ${toTitleCase(row.county)}`)
  if (row.initial_dos_filing_date) lines.push(`First filed: ${row.initial_dos_filing_date.slice(0, 10)}`)
  const agent = [row.dos_process_name, row.dos_process_address_1, row.dos_process_city, row.dos_process_state, row.dos_process_zip]
    .map(s => s?.trim()).filter(Boolean).join(', ')
  if (agent) lines.push(`Registered agent: ${agent}`)
  return lines.join('\n')
}

export async function syncNyCorpRegistry(supabase: SupabaseClient): Promise<SyncResult> {
  const result: SyncResult = { added: 0, updated: 0, skipped: 0, errors: [] }

  // Pre-load NY landlords so we can match by name without N+1 queries.
  // 21k landlords × 24 bytes = ~500KB — fine.
  const { data: nyLandlords } = await supabase
    .from('landlords')
    .select('id, display_name')
    .eq('state_abbr', 'NY')

  if (!nyLandlords?.length) {
    result.errors.push('No NY landlords in database — skipping.')
    return result
  }

  const byNameLower = new Map<string, string>()
  for (const l of nyLandlords) {
    if (l.display_name) byNameLower.set(l.display_name.toLowerCase().trim(), l.id)
  }

  for (let page = 0; page < MAX_PAGES; page++) {
    const offset = page * PAGE_SIZE
    const url = `${ENDPOINT}?$limit=${PAGE_SIZE}&$offset=${offset}&$order=dos_id`
    let rows: NyRow[]
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(45000) })
      if (!res.ok) {
        if (res.status === 429) {
          // Brief backoff and retry once
          await new Promise(r => setTimeout(r, 5000))
          const retry = await fetch(url, { signal: AbortSignal.timeout(45000) })
          if (!retry.ok) { result.errors.push(`HTTP ${retry.status} on retry @ offset ${offset}`); break }
          rows = await retry.json()
        } else {
          result.errors.push(`HTTP ${res.status} @ offset ${offset}`)
          break
        }
      } else {
        rows = await res.json()
      }
    } catch (e) {
      result.errors.push(e instanceof Error ? e.message : String(e))
      break
    }

    if (!Array.isArray(rows) || rows.length === 0) break

    const matches: Array<{ row: NyRow; landlordId: string }> = []
    for (const row of rows) {
      const name = row.current_entity_name
      const type = row.entity_type
      if (!name || !type || !row.dos_id) { result.skipped++; continue }
      if (!RELEVANT_ENTITY_TYPES.has(type)) { result.skipped++; continue }

      const key = normalizeEntityName(name).toLowerCase()
      const landlordId = byNameLower.get(key)
      if (!landlordId) { result.skipped++; continue }

      matches.push({ row, landlordId })
    }

    if (matches.length === 0) {
      if (rows.length < PAGE_SIZE) break
      continue
    }

    // Upsert in batches on (source, source_id) to dedup across runs.
    const records = matches.map(({ row, landlordId }) => ({
      landlord_id: landlordId,
      record_type: 'business_registration',
      source: 'ny_dos',
      source_id: row.dos_id,
      source_url: `https://apps.dos.ny.gov/publicInquiry/EntityDisplay?selectedSearchID=${row.dos_id}`,
      severity: 'low',
      status: 'active',
      title: buildTitle(row),
      description: buildDescription(row),
      filed_date: row.initial_dos_filing_date?.slice(0, 10) ?? null,
    }))

    const { error, count } = await supabase
      .from('public_records')
      .upsert(records, { onConflict: 'source,source_id', count: 'exact' })

    if (error) {
      result.errors.push(`upsert failed: ${error.message}`)
    } else {
      result.added += count ?? records.length
    }

    if (rows.length < PAGE_SIZE) break
  }

  return result
}
