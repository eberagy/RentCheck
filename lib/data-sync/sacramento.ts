import type { SupabaseClient } from '@supabase/supabase-js'
import { withRetry, upsertRecords } from './utils'

const DATASETS = [
  'https://data.cityofsacramento.org/resource/nx4q-fhg7.json', // code enforcement
  'https://data.cityofsacramento.org/resource/e87j-w26b.json', // violations
  'https://data.cityofsacramento.org/resource/f7ty-9sac.json', // property maintenance
]
const PAGE_SIZE = 1000

export async function syncSacramento(supabase: SupabaseClient) {
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
        source: 'sacramento_code',
        source_id: r.case_number ?? r.violation_id ?? r.id ?? `${offset}-${Math.random()}`,
        record_type: 'code_violation',
        status: (r.status ?? r.case_status ?? '').toLowerCase().includes('close') ? 'closed' : 'open',
        description: r.violation_description ?? r.code_sections ?? r.description ?? null,
        address: r.address ?? r.parcel_address ?? r.location ?? null,
        city: 'Sacramento',
        state: 'CA',
        filed_date: r.date_filed ?? r.open_date ?? r.case_opened ?? null,
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
