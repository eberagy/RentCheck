import type { SupabaseClient } from '@supabase/supabase-js'
import { withRetry, upsertRecords } from './utils'

const DATASETS = [
  'https://data.raleighnc.gov/resource/34s6-emjf.json', // code enforcement
  'https://data.raleighnc.gov/resource/s2ag-sa4r.json', // housing violations
  'https://data.raleighnc.gov/resource/2vks-ybum.json', // permit violations
]
const PAGE_SIZE = 1000

export async function syncRaleigh(supabase: SupabaseClient) {
  let added = 0, updated = 0, skipped = 0
  const errors: string[] = []

  for (const endpoint of DATASETS) {
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
        source: 'raleigh_code',
        source_id: r.case_number ?? r.complaint_id ?? r.id ?? `${offset}-${Math.random()}`,
        record_type: 'code_violation',
        status: (r.status ?? r.case_status ?? '').toLowerCase().includes('close') ? 'closed' : 'open',
        description: r.violation_description ?? r.violation_type ?? r.description ?? null,
        address: r.address ?? r.site_address ?? r.property_address ?? null,
        city: 'Raleigh',
        state: 'NC',
        filed_date: r.date_filed ?? r.open_date ?? r.created_date ?? null,
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
