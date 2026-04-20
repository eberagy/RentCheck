/**
 * HUD Multifamily Assisted Properties — Owner/Management Company Data
 * Source: HUD Office of Multifamily Housing Programs
 * API: https://data.hud.gov (public, no key required)
 *
 * This dataset contains ~20k subsidized multifamily properties nationwide
 * with owner names, management companies, and addresses.
 * Great source for corporate/institutional landlords.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeAddress, type SyncResult } from './utils'
import slugify from 'slugify'

const ENDPOINTS = [
  // HUD Multifamily Assistance & Section 8 Properties
  'https://data.hud.gov/resource/wazz-zxkr.json',
  // HUD Picture of Subsidized Households - property-level
  'https://data.hud.gov/resource/3qem-6v3v.json',
]

const PAGE_SIZE = 1000

export async function syncHudMultifamily(supabase: SupabaseClient): Promise<SyncResult> {
  const result: SyncResult = { added: 0, updated: 0, skipped: 0, errors: [] }

  // Find working endpoint
  let workingEndpoint: string | null = null
  for (const ep of ENDPOINTS) {
    try {
      const probe = await fetch(`${ep}?$limit=1`, { signal: AbortSignal.timeout(10000) })
      if (probe.ok) {
        const data = await probe.json()
        if (Array.isArray(data) && data.length > 0) { workingEndpoint = ep; break }
      }
    } catch { /* try next */ }
  }

  if (!workingEndpoint) {
    result.errors.push('HUD Multifamily endpoint unavailable. Register at data.hud.gov for API access.')
    return result
  }

  const processedOwners = new Map<string, string>()
  let offset = 0

  while (true) {
    const url = `${workingEndpoint}?$limit=${PAGE_SIZE}&$offset=${offset}&$order=:id`
    let rows: any[]
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
      if (!res.ok) { result.errors.push(`HTTP ${res.status}`); break }
      rows = await res.json()
      if (!Array.isArray(rows)) break
    } catch (e) {
      result.errors.push(e instanceof Error ? e.message : String(e)); break
    }
    if (rows.length === 0) break

    for (const row of rows) {
      try {
        // Owner name from multiple possible field names
        const ownerRaw =
          row.owner_name ?? row.ownername ?? row.owner ?? row.property_name ?? null
        if (!ownerRaw) { result.skipped++; continue }
        const ownerName = ownerRaw.trim()
        if (!ownerName) { result.skipped++; continue }

        const address = row.address ?? row.property_address ?? row.address1 ?? ''
        const city = row.city ?? row.property_city ?? ''
        const stateAbbr = row.state ?? row.property_state ?? ''
        const zip = row.zip ?? row.zip_code ?? ''

        if (!address || !city || !stateAbbr) { result.skipped++; continue }

        const addrNorm = normalizeAddress(address)
        const ownerKey = `${ownerName.toLowerCase()}|${stateAbbr.toLowerCase()}`

        let landlordId = processedOwners.get(ownerKey)
        if (!landlordId) {
          const { data: existing } = await supabase
            .from('landlords')
            .select('id')
            .ilike('display_name', ownerName)
            .eq('state_abbr', stateAbbr.toUpperCase())
            .limit(1)
            .single()

          if (existing) {
            landlordId = existing.id
          } else {
            const baseSlug = slugify(`${ownerName}-${stateAbbr}`, { lower: true, strict: true })
            const suffix = Math.random().toString(36).slice(2, 6)
            const stateMap: Record<string, string> = {
              NY: 'New York', CA: 'California', TX: 'Texas', FL: 'Florida',
              IL: 'Illinois', PA: 'Pennsylvania', OH: 'Ohio', GA: 'Georgia',
              NC: 'North Carolina', MI: 'Michigan', WA: 'Washington', MA: 'Massachusetts',
              AZ: 'Arizona', IN: 'Indiana', TN: 'Tennessee', MO: 'Missouri',
              MD: 'Maryland', CO: 'Colorado', OR: 'Oregon', MN: 'Minnesota',
            }
            const { data: newLandlord } = await supabase
              .from('landlords')
              .insert({
                display_name: ownerName,
                business_name: row.mgmt_agent ?? row.management_agent ?? null,
                slug: `${baseSlug}-${suffix}`,
                city,
                state: stateMap[stateAbbr.toUpperCase()] ?? stateAbbr,
                state_abbr: stateAbbr.toUpperCase(),
                zip,
                website: row.website ?? null,
                phone: row.phone ?? null,
              })
              .select('id')
              .single()
            landlordId = newLandlord?.id ?? null
            if (landlordId) result.added++
          }

          if (landlordId) processedOwners.set(ownerKey, landlordId)
        }

        // Link property
        if (landlordId && address) {
          await supabase.from('properties').upsert({
            address_line1: address,
            city,
            state: stateAbbr,
            state_abbr: stateAbbr.toUpperCase(),
            zip,
            address_normalized: addrNorm,
            landlord_id: landlordId,
            unit_count: row.total_units ?? row.units ?? null,
          }, { onConflict: 'address_normalized,city,state_abbr', ignoreDuplicates: false })
        }
      } catch (e) {
        result.errors.push(e instanceof Error ? e.message : String(e))
      }
    }

    offset += PAGE_SIZE
    if (rows.length < PAGE_SIZE) break
    if (offset > 50000) break
  }

  return result
}
