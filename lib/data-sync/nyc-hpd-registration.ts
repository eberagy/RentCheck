/**
 * NYC HPD Building Registration
 * Source: NYC Open Data
 * API: https://data.cityofnewyork.us/resource/yzmf-gg2k.json (Socrata)
 * ~100k+ registered NYC rental buildings with owner names, company names, head officers
 *
 * ALL residential buildings in NYC must register with HPD.
 * This is the most comprehensive NYC landlord→building registry available.
 * Distinct from rent stabilization: covers ALL rental housing.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeAddress, type SyncResult } from './utils'
import slugify from 'slugify'

const ENDPOINT = 'https://data.cityofnewyork.us/resource/yzmf-gg2k.json'
const PAGE_SIZE = 2000

export async function syncNycHpdRegistration(supabase: SupabaseClient): Promise<SyncResult> {
  const result: SyncResult = { added: 0, updated: 0, skipped: 0, errors: [] }

  let offset = 0
  const processedOwners = new Map<string, string>()

  while (true) {
    const url = `${ENDPOINT}?$select=buildingid,buildingaddress,zipcode,boroid,lifecyclestage,` +
      `ownerfirstname,ownerlastname,ownerzip,companyname,` +
      `headofficerfirstname,headofficerlastname` +
      `&$limit=${PAGE_SIZE}&$offset=${offset}&$order=buildingid`

    let rows: any[]
    try {
      const res = await fetch(url, {
        headers: { 'X-App-Token': process.env.NYC_OPEN_DATA_TOKEN ?? '' },
        signal: AbortSignal.timeout(30000),
      })
      if (!res.ok) { result.errors.push(`HTTP ${res.status} from HPD Registration`); break }
      rows = await res.json()
      if (!Array.isArray(rows)) break
    } catch (e) {
      result.errors.push(e instanceof Error ? e.message : String(e)); break
    }
    if (rows.length === 0) break

    for (const row of rows) {
      try {
        // Prefer company name; fall back to individual name; then head officer
        const ownerName = pickOwnerName(row)
        if (!ownerName || isGovernmentOwner(ownerName)) { result.skipped++; continue }

        const address = row.buildingaddress?.trim() ?? ''
        if (!address) { result.skipped++; continue }

        const zip = row.zipcode ?? row.ownerzip ?? ''
        const city = boroIdToCity(row.boroid)
        const addrNorm = normalizeAddress(address)
        const ownerKey = ownerName.toLowerCase()

        let landlordId = processedOwners.get(ownerKey)
        if (!landlordId) {
          const { data: existing } = await supabase
            .from('landlords')
            .select('id')
            .ilike('display_name', ownerName)
            .eq('state_abbr', 'NY')
            .limit(1)
            .single()

          if (existing) {
            landlordId = existing.id
          } else {
            const baseSlug = slugify(`${ownerName}-nyc`, { lower: true, strict: true })
            const suffix = Math.random().toString(36).slice(2, 6)
            const { data: newLandlord } = await supabase
              .from('landlords')
              .insert({
                display_name: ownerName,
                slug: `${baseSlug}-${suffix}`,
                city: city || 'New York City',
                state: 'New York',
                state_abbr: 'NY',
                zip,
              })
              .select('id')
              .single()
            landlordId = newLandlord?.id ?? null
            if (landlordId) result.added++
          }
          if (landlordId) processedOwners.set(ownerKey, landlordId)
        }

        if (landlordId && address) {
          await supabase.from('properties').upsert({
            address_line1: address,
            city: city || 'New York City',
            state: 'New York',
            state_abbr: 'NY',
            zip,
            address_normalized: addrNorm,
            landlord_id: landlordId,
          }, { onConflict: 'address_normalized,city,state_abbr', ignoreDuplicates: false })
        }
      } catch (e) {
        result.errors.push(e instanceof Error ? e.message : String(e))
      }
    }

    offset += PAGE_SIZE
    if (rows.length < PAGE_SIZE) break
    if (offset > 200000) break
  }

  return result
}

function pickOwnerName(row: any): string | null {
  // Company name is most reliable identifier
  if (row.companyname?.trim() && row.companyname.trim().length > 1) {
    return toTitleCase(row.companyname.trim())
  }
  // Individual owner first+last
  const first = row.ownerfirstname?.trim() ?? ''
  const last = row.ownerlastname?.trim() ?? ''
  if (first && last) return `${toTitleCase(first)} ${toTitleCase(last)}`
  if (last) return toTitleCase(last)
  // Head officer fallback
  const hFirst = row.headofficerfirstname?.trim() ?? ''
  const hLast = row.headofficerlastname?.trim() ?? ''
  if (hFirst && hLast) return `${toTitleCase(hFirst)} ${toTitleCase(hLast)}`
  return null
}

function toTitleCase(s: string): string {
  if (!s) return s
  // If all caps, convert to title case
  if (s === s.toUpperCase()) {
    return s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
  }
  return s
}

function boroIdToCity(boroid: string | number): string {
  const id = String(boroid)
  if (id === '1') return 'Manhattan'
  if (id === '2') return 'Bronx'
  if (id === '3') return 'Brooklyn'
  if (id === '4') return 'Queens'
  if (id === '5') return 'Staten Island'
  return 'New York City'
}

const GOV_KEYWORDS = [
  'city of new york', 'new york city', 'nyc', 'nycha', 'hpd',
  'new york state', 'united states', 'dept of', 'department of',
  'housing authority', 'board of', 'public school',
]

function isGovernmentOwner(name: string): boolean {
  const lower = name.toLowerCase()
  return GOV_KEYWORDS.some(kw => lower.includes(kw))
}
