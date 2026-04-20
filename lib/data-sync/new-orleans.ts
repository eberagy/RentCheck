import type { SupabaseClient } from '@supabase/supabase-js'
import { withRetry, upsertRecords } from './utils'

// New Orleans uses Socrata at data.nola.gov
const DATASETS = [
  'https://data.nola.gov/resource/webo-imke.json', // code enforcement cases
  'https://data.nola.gov/resource/6yej-s9ak.json', // blight violations
  'https://data.nola.gov/resource/gxur-kxk9.json', // 311 housing
]
const PAGE_SIZE = 1000

export async function syncNewOrleans(supabase: SupabaseClient) {
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
        source: 'new_orleans_code',
        source_id: r.case_number ?? r.caseid ?? r.ticket_id ?? r.id ?? `${offset}-${Math.random()}`,
        record_type: 'code_violation',
        status: (r.status ?? r.case_status ?? '').toLowerCase().includes('close') ? 'closed' : 'open',
        description: r.violation_description ?? r.description ?? r.category ?? null,
        address: r.address ?? r.violation_address ?? r.property_address ?? null,
        city: 'New Orleans',
        state: 'LA',
        filed_date: r.date_filed ?? r.open_date ?? r.date_entered ?? null,
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
