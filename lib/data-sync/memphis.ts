import type { SupabaseClient } from '@supabase/supabase-js'
import { withRetry, upsertRecords } from './utils'

const DATASETS = [
  'https://data.memphistn.gov/resource/hmd4-gnx4.json', // code enforcement
  'https://data.memphistn.gov/resource/kf4t-uuk7.json', // blight
  'https://data.memphistn.gov/resource/umcm-p9vz.json', // property violations
]
const PAGE_SIZE = 1000

export async function syncMemphis(supabase: SupabaseClient) {
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
        source: 'memphis_code',
        source_id: r.case_number ?? r.caseid ?? r.id ?? `${offset}-${Math.random()}`,
        record_type: 'code_violation',
        status: (r.status ?? r.case_status ?? '').toLowerCase().includes('close') ? 'closed' : 'open',
        description: r.violation_description ?? r.description ?? r.complaint_type ?? null,
        address: r.address ?? r.violation_address ?? r.location ?? null,
        city: 'Memphis',
        state: 'TN',
        filed_date: r.date_filed ?? r.open_date ?? r.date_opened ?? null,
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
