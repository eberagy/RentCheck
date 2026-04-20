import type { SupabaseClient } from '@supabase/supabase-js'
import { withRetry, upsertRecords } from './utils'

const DATASETS = [
  'https://data.louisvilleky.gov/resource/4gy9-m8ij.json', // code enforcement
  'https://data.louisvilleky.gov/resource/i4mh-gu7e.json', // violations
  'https://data.louisvilleky.gov/resource/bhvs-3xgr.json', // rental inspections
]
const PAGE_SIZE = 1000

export async function syncLouisville(supabase: SupabaseClient) {
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
        source: 'louisville_code',
        source_id: r.case_number ?? r.violation_id ?? r.id ?? `${offset}-${Math.random()}`,
        record_type: 'code_violation',
        status: (r.status ?? r.case_status ?? '').toLowerCase().includes('close') ? 'closed' : 'open',
        description: r.violation_description ?? r.description ?? r.nature_of_complaint ?? null,
        address: r.address ?? r.violation_address ?? r.property_address ?? null,
        city: 'Louisville',
        state: 'KY',
        filed_date: r.date_filed ?? r.open_date ?? r.date_entered ?? null,
        closed_date: r.close_date ?? r.date_closed ?? null,
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
