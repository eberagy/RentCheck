import type { SupabaseClient } from '@supabase/supabase-js'
import { withRetry, upsertRecords } from './utils'

const DATASETS = [
  'https://www.stlouis-mo.gov/data/upload/data-files/code-violations.json', // flat file
  'https://data.stlouis-mo.gov/resource/5vj9-v8c5.json', // code violations
  'https://data.stlouis-mo.gov/resource/px5e-4jkv.json', // building permits & violations
]
const SOCRATA_DATASETS = [
  'https://data.stlouis-mo.gov/resource/5vj9-v8c5.json',
  'https://data.stlouis-mo.gov/resource/px5e-4jkv.json',
]
const PAGE_SIZE = 1000

export async function syncStLouis(supabase: SupabaseClient) {
  let added = 0, updated = 0, skipped = 0
  const errors: string[] = []

  for (const endpoint of SOCRATA_DATASETS) {
    let offset = 0
    let found = false

    while (offset < 100_000) {
      const url = `${endpoint}?$limit=${PAGE_SIZE}&$offset=${offset}&$order=:id`
      let rows: Record<string, string>[]
      try {
        const res = await withRetry(() => fetch(url))
        if (!res.ok) break
        rows = await res.json()
        if (!rows.length) break
        found = true
      } catch {
        break
      }

      const records = rows.map(r => ({
        source: 'stlouis_code',
        source_id: r.case_number ?? r.violation_id ?? r.id ?? `${offset}-${Math.random()}`,
        record_type: 'code_violation',
        status: (r.status ?? r.current_status ?? '').toLowerCase().includes('close') ? 'closed' : 'open',
        description: r.violation_description ?? r.description ?? r.complaint_description ?? null,
        address: r.address ?? r.violation_address ?? r.location_address ?? null,
        city: 'St. Louis',
        state: 'MO',
        filed_date: r.date_filed ?? r.open_date ?? r.entry_date ?? null,
        closed_date: r.close_date ?? r.closed_date ?? null,
        raw: r,
      }))

      const res = await upsertRecords(supabase, records)
      added += res.added; updated += res.updated; skipped += res.skipped
      if (res.errors.length) errors.push(...res.errors.slice(0, 2))
      offset += PAGE_SIZE
    }

    if (found) break
  }

  return { added, updated, skipped, errors }
}
