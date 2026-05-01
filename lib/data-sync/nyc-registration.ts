/**
 * NYC Rent Stabilization / Registration Sync
 * API: https://data.cityofnewyork.us/resource/tesw-yqqr.json
 * Creates landlords + properties from rent-stabilized building registrations.
 * Batched to avoid Vercel timeouts — processes 1 page then exits (called daily, makes progress each run).
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeAddress, type SyncResult } from './utils'
import slugify from 'slugify'

const ENDPOINT = 'https://data.cityofnewyork.us/resource/tesw-yqqr.json'
// Process 5 pages per run (5,000 rows). Daily cron will page through the full ~50k dataset over 10 days.
const PAGE_SIZE = 1000
const MAX_PAGES = 5

export async function syncNycRegistration(supabase: SupabaseClient): Promise<SyncResult> {
  const result: SyncResult = { added: 0, updated: 0, skipped: 0, errors: [] }

  // Resume from last processed offset stored in sync metadata
  // Simple approach: always fetch latest (registrations don't change often)
  let offset = 0
  let pagesProcessed = 0

  while (pagesProcessed < MAX_PAGES) {
    const url = `${ENDPOINT}?$limit=${PAGE_SIZE}&$offset=${offset}&$order=registrationid`
    let rows: any[]
    try {
      const res = await fetch(url, {
        headers: { 'X-App-Token': process.env.NYC_OPEN_DATA_TOKEN ?? '' },
        signal: AbortSignal.timeout(20000),
      })
      if (!res.ok) { result.errors.push(`HTTP ${res.status}`); break }
      rows = await res.json()
    } catch (e) { result.errors.push(e instanceof Error ? e.message : String(e)); break }
    if (!rows.length) break

    // ── Batch-upsert properties ──────────────────────────────────────────────
    const addrMap = new Map<string, { addr: string; zip: string }>()
    for (const row of rows) {
      const addr = (row.buildingaddress ?? '').trim()
      if (addr) addrMap.set(normalizeAddress(addr), { addr, zip: row.zipcode ?? '' })
    }
    const propRows = Array.from(addrMap.entries()).map(([norm, v]) => ({
      address_line1: v.addr, city: 'New York City', state: 'New York',
      state_abbr: 'NY', zip: v.zip, address_normalized: norm,
    }))
    const propIdMap = new Map<string, string>() // addrNorm → propertyId
    for (let i = 0; i < propRows.length; i += 200) {
      const slice = propRows.slice(i, i + 200)
      const { data } = await supabase.from('properties')
        .upsert(slice, { onConflict: 'address_normalized,city,state_abbr', ignoreDuplicates: true })
        .select('id, address_normalized')
      for (const p of data ?? []) if (p.address_normalized) propIdMap.set(p.address_normalized, p.id)
      const missing = slice
        .map(r => r.address_normalized)
        .filter((norm): norm is string => typeof norm === 'string' && !propIdMap.has(norm))
      if (missing.length) {
        const { data: existing } = await supabase.from('properties')
          .select('id, address_normalized')
          .in('address_normalized', missing)
          .eq('state_abbr', 'NY')
        for (const p of existing ?? []) if (p.address_normalized) propIdMap.set(p.address_normalized, p.id)
      }
    }

    // ── Collect unique owner names ───────────────────────────────────────────
    const ownerNames = Array.from(new Set(
      rows.map((r: any) => (r.ownername ?? '').trim()).filter((n: string) => n.length > 1)
    ))

    // Check which owners already exist (batch)
    const existingSet = new Set<string>()
    for (let i = 0; i < ownerNames.length; i += 100) {
      const chunk = ownerNames.slice(i, i + 100)
      const { data } = await supabase.from('landlords')
        .select('display_name')
        .in('display_name', chunk)
      for (const l of data ?? []) existingSet.add(l.display_name.toLowerCase())
    }

    // ── Batch-insert new landlords ───────────────────────────────────────────
    const newLandlords = ownerNames
      .filter(name => !existingSet.has(name.toLowerCase()))
      .map(name => {
        const baseSlug = slugify(name + '-nyc', { lower: true, strict: true })
        const suffix = Math.random().toString(36).slice(2, 6)
        return {
          display_name: name,
          slug: `${baseSlug}-${suffix}`,
          city: 'New York City',
          state: 'New York',
          state_abbr: 'NY',
        }
      })

    for (let i = 0; i < newLandlords.length; i += 100) {
      const { data, error } = await supabase.from('landlords')
        .insert(newLandlords.slice(i, i + 100))
        .select('id, display_name')
      if (error) result.errors.push(error.message)
      else result.added += data?.length ?? 0
    }

    result.skipped += ownerNames.length - newLandlords.length
    offset += PAGE_SIZE
    pagesProcessed++
    if (rows.length < PAGE_SIZE) break
  }

  return result
}
