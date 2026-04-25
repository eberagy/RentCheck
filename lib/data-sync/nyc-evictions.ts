/**
 * NYC Marshal Evictions
 * API: https://data.cityofnewyork.us/resource/6z8x-wfk4.json (Socrata)
 *
 * Every executed residential eviction in NYC by a city marshal. Unlike
 * court filings, these are actual lockouts — high-signal for renters
 * trying to vet a building.
 *
 * Each row is keyed by (court_index_number, docket_number, executed_date).
 * The dataset uses snake_case fields and the `eviction_address` is the
 * unit-level street address; we link to a property by normalized address.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveProperty, normalizeAddress, type SyncResult } from './utils'

const ENDPOINT = 'https://data.cityofnewyork.us/resource/6z8x-wfk4.json'
const PAGE_SIZE = 1000

type Row = {
  court_index_number?: string
  docket_number?: string
  eviction_address?: string
  eviction_apt_num?: string
  executed_date?: string
  marshal_first_name?: string
  marshal_last_name?: string
  residential_commercial_ind?: string
  borough?: string
  eviction_zip?: string
  ejectment?: string
  eviction_possession?: string
}

function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

function normalizeBorough(b: string | undefined): string {
  if (!b) return 'New York'
  const norm = b.trim().toLowerCase()
  if (norm === 'manhattan') return 'New York'
  if (norm === 'brooklyn') return 'Brooklyn'
  if (norm === 'bronx') return 'Bronx'
  if (norm === 'queens') return 'Queens'
  if (norm === 'staten island') return 'Staten Island'
  return titleCase(b)
}

export async function syncNycEvictions(supabase: SupabaseClient): Promise<SyncResult> {
  const result: SyncResult = { added: 0, updated: 0, skipped: 0, errors: [] }

  // Last 18 months — captures all currently-actionable evictions.
  const since = new Date(Date.now() - 540 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  let offset = 0
  while (true) {
    const where = encodeURIComponent(`executed_date>'${since}' AND residential_commercial_ind='Residential'`)
    const url = `${ENDPOINT}?$where=${where}&$limit=${PAGE_SIZE}&$offset=${offset}&$order=executed_date DESC`

    let rows: Row[]
    try {
      const res = await fetch(url, {
        headers: { 'X-App-Token': process.env.NYC_OPEN_DATA_TOKEN ?? '' },
        signal: AbortSignal.timeout(30000),
      })
      if (!res.ok) { result.errors.push(`HTTP ${res.status}`); break }
      rows = await res.json()
    } catch (e) {
      result.errors.push(e instanceof Error ? e.message : String(e)); break
    }

    if (!Array.isArray(rows) || rows.length === 0) break

    for (const row of rows) {
      try {
        const sourceId = [row.court_index_number, row.docket_number, row.executed_date]
          .filter(Boolean).join('|')
        if (!sourceId || !row.eviction_address) { result.skipped++; continue }

        const street = row.eviction_address.trim()
        const cityName = normalizeBorough(row.borough)
        const addrNorm = normalizeAddress(street)

        let propertyId = await resolveProperty(supabase, addrNorm, cityName, 'NY')
        if (!propertyId) {
          const { data: newProp } = await supabase
            .from('properties')
            .insert({
              address_line1: street,
              city: cityName,
              state: 'New York',
              state_abbr: 'NY',
              zip: row.eviction_zip ?? '',
              address_normalized: addrNorm,
            })
            .select('id').single()
          propertyId = newProp?.id ?? null
        }

        const apt = row.eviction_apt_num ? ` Apt ${row.eviction_apt_num}` : ''
        const titleBase = `Marshal eviction executed at ${street}${apt}`
        const title = titleBase.length >= 10 ? titleBase.slice(0, 150) : 'Marshal eviction executed (NYC)'

        const marshal = [row.marshal_first_name, row.marshal_last_name].filter(Boolean).join(' ').trim()
        const descLines: string[] = []
        if (row.eviction_possession) descLines.push(`Result: ${row.eviction_possession}`)
        if (row.ejectment && row.ejectment !== 'Not an Ejectment') descLines.push(`Type: ${row.ejectment}`)
        if (marshal) descLines.push(`Marshal: ${marshal}`)
        if (row.court_index_number) descLines.push(`Court index: ${row.court_index_number}`)

        const filed = row.executed_date ? row.executed_date.slice(0, 10) : null

        const { error } = await supabase.from('public_records').upsert({
          source: 'nyc_marshals',
          source_id: sourceId,
          source_url: 'https://data.cityofnewyork.us/City-Government/Evictions/6z8x-wfk4',
          record_type: 'eviction',
          property_id: propertyId,
          title,
          description: descLines.length ? descLines.join('\n') : null,
          severity: 'high',
          status: 'closed', // executed = already happened
          filed_date: filed,
          case_number: row.court_index_number ?? null,
          raw_data: row,
        }, { onConflict: 'source,source_id', ignoreDuplicates: false })

        if (error) { result.errors.push(error.message); continue }
        result.added++
      } catch (e) {
        result.errors.push(e instanceof Error ? e.message : String(e))
      }
    }

    offset += PAGE_SIZE
    if (rows.length < PAGE_SIZE) break
    if (offset > 30_000) break
  }

  return result
}
