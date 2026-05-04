/**
 * HUD REAC Physical Inspection Scores
 * Federally subsidized/assisted housing inspection results
 * Data: HUD Open Data portal (Socrata) + HUD Picture of Subsidized Households
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeAddress, batchUpsert, upsertPropertiesAndMap, type SocrataRow, type SyncResult } from './utils'

// HUD open data Socrata endpoints to try
const ENDPOINTS = [
  // HUD Multifamily Inspection Scores (requires HUD API key via env var)
  process.env.HUD_API_KEY
    ? `https://data.hud.gov/resource/3qem-6v3v.json?$$app_token=${process.env.HUD_API_KEY}`
    : null,
  // Public HUD Multifamily property listings (no auth required)
  'https://data.hud.gov/resource/wazz-zxkr.json',
  // HUD Picture of Subsidized Households
  'https://opendata.hud.gov/resource/3qem-6v3v.json',
].filter(Boolean) as string[]

const PAGE_SIZE = 1000

export async function syncHudInspections(supabase: SupabaseClient): Promise<SyncResult> {
  const result: SyncResult = { added: 0, updated: 0, skipped: 0, errors: [] }

  let workingEndpoint: string | null = null
  for (const ep of ENDPOINTS) {
    try {
      const probe = await fetch(`${ep}${ep.includes('?') ? '&' : '?'}$limit=1`, {
        signal: AbortSignal.timeout(10000),
      })
      if (probe.ok) {
        const data = await probe.json()
        if (Array.isArray(data)) { workingEndpoint = ep; break }
      }
    } catch { /* try next */ }
  }

  if (!workingEndpoint) {
    result.errors.push(
      'HUD REAC data unavailable via public API. Register for a free HUD API key at ' +
      'https://www.hud.gov/program_offices/housing/mfh/grants/openapi and set HUD_API_KEY env var.'
    )
    return result
  }

  let offset = 0
  while (true) {
    const sep = workingEndpoint.includes('?') ? '&' : '?'
    const url = `${workingEndpoint}${sep}$limit=${PAGE_SIZE}&$offset=${offset}&$order=:id`

    let rows: SocrataRow[]
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
      if (!res.ok) { result.errors.push(`HTTP ${res.status} from HUD API`); break }
      rows = await res.json()
      if (!Array.isArray(rows)) break
    } catch (e) {
      result.errors.push(e instanceof Error ? e.message : String(e)); break
    }
    if (rows.length === 0) break

    // HUD ships rows from many cities/states — group by (city, state).
    type HudKey = string  // `${addrNorm}|${city}|${state}`
    const uniqueKeys = new Map<HudKey, { addr: string; city: string; state: string; zip: string }>()
    for (const row of rows) {
      const addr = (row.address ?? row.property_address ?? row.address1 ?? '').trim()
      const city = (row.city ?? row.property_city ?? '').trim()
      const state = (row.state ?? row.property_state ?? '').trim()
      if (!addr || !city || !state) continue
      const norm = normalizeAddress(addr)
      if (!norm) continue
      const key = `${norm}|${city}|${state}`
      if (!uniqueKeys.has(key)) uniqueKeys.set(key, { addr, city, state, zip: row.zip ?? row.zip_code ?? '' })
    }
    const propRows = Array.from(uniqueKeys.values()).map(v => ({
      address_line1: v.addr,
      city: v.city,
      state: v.state,
      state_abbr: v.state.length <= 3 ? v.state.toUpperCase() : v.state,
      zip: v.zip,
      address_normalized: normalizeAddress(v.addr),
    }))
    const propIdMap = await upsertPropertiesAndMap(supabase, propRows, result)

    const toInsert: Record<string, unknown>[] = []
    for (const row of rows) {
      const sourceId = String(
        row.hud_project_number ?? row.contract_number ?? row.project_id ?? row.id ?? ''
      )
      if (!sourceId) { result.skipped++; continue }
      const addr = row.address ?? row.property_address ?? row.address1 ?? ''
      const city = row.city ?? row.property_city ?? ''
      if (!addr || !city) { result.skipped++; continue }
      const propertyId = propIdMap.get(normalizeAddress(addr)) ?? null

      const score = row.inspection_score ?? row.reac_score ?? null
      const numScore = score !== null ? Number(score) : null
      const severity = numScore !== null
        ? (numScore < 30 ? 'critical' : numScore < 60 ? 'high' : 'medium')
        : 'medium'

      toInsert.push({
        source: 'hud_reac',
        source_id: sourceId,
        record_type: 'hud_inspection',
        property_id: propertyId,
        title: `HUD Inspection: Score ${numScore ?? 'N/A'} — ${row.property_name ?? addr}`.slice(0, 150),
        description: numScore !== null
          ? `HUD REAC score: ${numScore} (${numScore < 60 ? 'failing — significant deficiencies' : 'passing'}). Property: ${row.property_name ?? addr}`
          : `HUD-assisted property: ${row.property_name ?? addr}`,
        severity,
        status: numScore !== null && numScore >= 60 ? 'closed' : 'open',
        filed_date: (row.inspection_date ?? row.action_date)
          ? new Date(row.inspection_date ?? row.action_date).toISOString().split('T')[0]
          : null,
        source_url: 'https://www.huduser.gov/portal/datasets/pis.html',
        raw_data: row,
      })
    }
    await batchUpsert(supabase, toInsert, result)

    offset += PAGE_SIZE
    if (rows.length < PAGE_SIZE) break
    if (offset > 50000) break
  }

  return result
}
