import type { SupabaseClient } from '@supabase/supabase-js'
import { withRetry, upsertRecords } from './utils'

const DATASETS = [
  'https://data.kcmo.org/resource/nhtf-e75a.json', // code cases
  'https://data.kcmo.org/resource/hz3j-8bdy.json', // 311 service requests
  'https://data.kcmo.org/resource/fdib-6pvs.json', // violations
]
const PAGE_SIZE = 1000

export async function syncKansasCity(supabase: SupabaseClient) {
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
        source: 'kansas_city_code',
        source_id: r.case_number ?? r.caseid ?? r.id ?? `${offset}-${Math.random()}`,
        record_type: (r.request_type ?? r.case_type ?? '').toLowerCase().includes('evict') ? 'eviction' : 'code_violation',
        status: (r.status ?? r.case_status ?? '').toLowerCase().includes('close') ? 'closed' : 'open',
        description: r.violation_description ?? r.description ?? r.request_description ?? null,
        address: r.address ?? r.address_line1 ?? r.location ?? null,
        city: 'Kansas City',
        state: 'MO',
        filed_date: r.date_filed ?? r.add_date ?? r.creation_date ?? null,
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
