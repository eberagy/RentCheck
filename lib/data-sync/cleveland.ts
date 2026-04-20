import type { SupabaseClient } from '@supabase/supabase-js'
import { withRetry, upsertRecords } from './utils'

const DATASETS = [
  'https://data.clevelandohio.gov/resource/t6wv-prki.json', // housing court
  'https://data.clevelandohio.gov/resource/i6vj-e2pb.json', // code violations
  'https://data.clevelandohio.gov/resource/p8ry-3ydk.json', // property inspections
]
const PAGE_SIZE = 1000

export async function syncCleveland(supabase: SupabaseClient) {
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
        source: 'cleveland_code',
        source_id: r.case_number ?? r.violation_id ?? r.id ?? `${offset}-${Math.random()}`,
        record_type: (r.case_type ?? r.violation_type ?? '').toLowerCase().includes('evict') ? 'eviction' : 'code_violation',
        status: (r.status ?? r.case_status ?? '').toLowerCase().includes('close') ? 'closed' : 'open',
        description: r.violation_description ?? r.violation_type ?? r.description ?? null,
        address: r.address ?? r.parcel_address ?? r.property_address ?? null,
        city: 'Cleveland',
        state: 'OH',
        filed_date: r.date_filed ?? r.open_date ?? r.complaint_date ?? null,
        closed_date: r.close_date ?? r.resolved_date ?? null,
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
