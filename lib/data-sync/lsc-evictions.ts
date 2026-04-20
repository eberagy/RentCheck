/**
 * Eviction Filing Data — County-level aggregate records
 * Primary: Eviction Lab bulk CSV download (Princeton)
 * Fallback: Eviction Lab API v3
 * https://evictionlab.org/get-the-data/
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { SyncResult } from './utils'

// States with reliable eviction lab data coverage
const STATES = ['MD', 'PA', 'SC', 'WA', 'CA', 'IL', 'TX', 'NY', 'MA']

export async function syncLscEvictions(supabase: SupabaseClient): Promise<SyncResult> {
  const result: SyncResult = { added: 0, updated: 0, skipped: 0, errors: [] }

  const currentYear = new Date().getFullYear()
  // Try prior year first (current year data may not be published yet)
  const years = [currentYear - 1, currentYear - 2]

  for (const year of years) {
    for (const state of STATES) {
      try {
        // Eviction Lab v3 API — county-level annual data
        const url = `https://evictionlab.org/tool/data/${year}/states/${state}/counties.json`
        const res = await fetch(url, {
          headers: { 'User-Agent': 'Vett/1.0 (vettrentals.com)' },
          signal: AbortSignal.timeout(15000),
        })

        if (!res.ok) {
          // This is expected if data not published for that year/state — skip silently
          result.skipped++
          continue
        }

        const data = await res.json()
        const rows: any[] = Array.isArray(data) ? data : (data.data ?? data.features ?? [])

        for (const row of rows) {
          try {
            const props = row.properties ?? row
            const geoid = props.GEOID ?? props.geoid ?? props.geoId ?? props.fips ?? props.id
            if (!geoid) { result.skipped++; continue }

            const sourceId = `eviction-${state}-${geoid}-${year}`
            const filings = props.efr ?? props.filings ?? props.evictionFilings ?? props['eviction-filings'] ?? null
            const name = props.name ?? props.NAME ?? `${state} County`

            const { error } = await supabase.from('public_records').upsert({
              source: 'lsc_evictions',
              source_id: sourceId,
              record_type: 'eviction',
              title: `Eviction Filings: ${name} ${year}`.slice(0, 150),
              description: filings !== null
                ? `${name}: ${Number(filings).toLocaleString()} eviction filings in ${year}`
                : `Eviction filing data for ${name} ${year}`,
              severity: 'high',
              status: 'open',
              filed_date: `${year}-01-01`,
              raw_data: props,
            }, { onConflict: 'source,source_id', ignoreDuplicates: true })

            if (error) { result.errors.push(error.message); continue }
            result.added++
          } catch (e) {
            result.errors.push(e instanceof Error ? e.message : String(e))
          }
        }

        // Only need one successful year per state
        if (result.added > 0) break
      } catch (e) {
        result.errors.push(`${state} ${year}: ${e instanceof Error ? e.message : String(e)}`)
      }
    }
  }

  if (result.added === 0 && result.errors.length === 0) {
    result.errors.push('No eviction data found — Eviction Lab may have changed their data format or URLs.')
  }

  return result
}
