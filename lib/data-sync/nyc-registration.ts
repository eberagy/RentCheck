/**
 * NYC Rent Stabilization / Registration Sync
 * API: https://data.cityofnewyork.us/resource/tesw-yqqr.json
 * Extracts owner/management company for landlord seeding
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeAddress, type SyncResult } from './utils'
import slugify from 'slugify'

const ENDPOINT = 'https://data.cityofnewyork.us/resource/tesw-yqqr.json'
const PAGE_SIZE = 1000

export async function syncNycRegistration(supabase: SupabaseClient): Promise<SyncResult> {
  const result: SyncResult = { added: 0, updated: 0, skipped: 0, errors: [] }

  let offset = 0
  const processedLandlords = new Set<string>()

  while (true) {
    const url = `${ENDPOINT}?$limit=${PAGE_SIZE}&$offset=${offset}&$order=registrationid`
    const res = await fetch(url, { headers: { 'X-App-Token': process.env.NYC_OPEN_DATA_TOKEN ?? '' } })
    if (!res.ok) { result.errors.push(`HTTP ${res.status}`); break }

    const rows: any[] = await res.json()
    if (rows.length === 0) break

    for (const row of rows) {
      try {
        const sourceId = String(row.registrationid ?? '')
        if (!sourceId) { result.skipped++; continue }

        const addr = [row.buildingaddress].filter(Boolean).join(' ')
        const addrNorm = normalizeAddress(addr)
        const city = 'New York City'
        const state = 'NY'
        const zip = row.zipcode ?? ''

        // Upsert property
        let propertyId: string | null = null
        if (addr) {
          const { data: prop } = await supabase
            .from('properties')
            .upsert({ address_line1: addr, city, state: 'New York', state_abbr: state, zip, address_normalized: addrNorm }, { onConflict: 'address_normalized,city,state_abbr' })
            .select('id')
            .single()
          propertyId = prop?.id ?? null
        }

        // Seed landlord from owner name
        const ownerName = row.ownername?.trim() ?? null
        if (ownerName && !processedLandlords.has(ownerName.toLowerCase())) {
          processedLandlords.add(ownerName.toLowerCase())

          const { data: existing } = await supabase
            .from('landlords')
            .select('id')
            .ilike('display_name', ownerName)
            .limit(1)
            .single()

          if (!existing) {
            const baseSlug = slugify(ownerName + '-nyc', { lower: true, strict: true })
            const { data: landlord } = await supabase
              .from('landlords')
              .insert({ display_name: ownerName, slug: baseSlug, city, state: 'New York', state_abbr: state, zip })
              .select('id')
              .single()

            if (landlord && propertyId) {
              await supabase.from('properties').update({ landlord_id: landlord.id }).eq('id', propertyId)
            }
            result.added++
          } else {
            result.skipped++
          }
        }
      } catch (e) {
        result.errors.push(e instanceof Error ? e.message : String(e))
      }
    }

    offset += PAGE_SIZE
    if (rows.length < PAGE_SIZE) break
    // Cap at 50k records per run to avoid timeout
    if (offset > 50000) break
  }

  return result
}
