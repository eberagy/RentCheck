/**
 * Minneapolis, MN — Rental Licensing & Code Compliance Complaints
 * API: https://opendata.minneapolismn.gov (Socrata)
 * Datasets: Rental property licenses + code compliance
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveProperty, normalizeAddress, type SyncResult } from './utils'

const ENDPOINTS = [
  'https://opendata.minneapolismn.gov/resource/q4re-74nc.json', // Code compliance complaints
  'https://opendata.minneapolismn.gov/resource/n69y-pzp8.json', // Rental licenses
  'https://opendata.minneapolismn.gov/resource/y2ms-dhui.json', // Property maintenance
]
const PAGE_SIZE = 1000

export async function syncMinneapolis(supabase: SupabaseClient): Promise<SyncResult> {
  const result: SyncResult = { added: 0, updated: 0, skipped: 0, errors: [] }

  let workingEndpoint: string | null = null
  for (const ep of ENDPOINTS) {
    try {
      const probe = await fetch(`${ep}?$limit=1`, { signal: AbortSignal.timeout(8000) })
      if (probe.ok) {
        const rows = await probe.json()
        if (Array.isArray(rows) && rows.length > 0) { workingEndpoint = ep; break }
      }
    } catch { /* try next */ }
  }

  if (!workingEndpoint) {
    result.errors.push('No working Minneapolis endpoint found')
    return result
  }

  let offset = 0
  while (true) {
    const url = `${workingEndpoint}?$limit=${PAGE_SIZE}&$offset=${offset}&$order=:id`
    let rows: any[]
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(30000) })
      if (!res.ok) { result.errors.push(`HTTP ${res.status}`); break }
      rows = await res.json()
    } catch (e) {
      result.errors.push(e instanceof Error ? e.message : String(e)); break
    }
    if (rows.length === 0) break

    for (const row of rows) {
      try {
        const sourceId = String(row.complaintid ?? row.caseid ?? row.licenseid ?? row.objectid ?? '')
        if (!sourceId) { result.skipped++; continue }

        const addr = row.address ?? row.siteaddress ?? row.propertyaddress ?? ''
        const addrNorm = normalizeAddress(addr)
        let propertyId = await resolveProperty(supabase, addrNorm, 'Minneapolis', 'MN')
        if (!propertyId && addr) {
          const { data: newProp } = await supabase.from('properties').insert({
            address_line1: addr, city: 'Minneapolis', state: 'Minnesota', state_abbr: 'MN',
            zip: row.zip ?? row.zipcode ?? '', address_normalized: addrNorm,
          }).select('id').single()
          propertyId = newProp?.id ?? null
        }

        const { error } = await supabase.from('public_records').upsert({
          source: 'minneapolis_code',
          source_id: sourceId,
          record_type: 'minneapolis_violation',
          property_id: propertyId,
          title: buildTitle(row),
          description: row.violationdescription ?? row.complainttype ?? row.statusdesc ?? null,
          severity: mapSeverity(row.prioritydesc ?? row.severity),
          status: mapStatus(row.statusdesc ?? row.status),
          filed_date: (row.complaintdate ?? row.opendate) ? new Date(row.complaintdate ?? row.opendate).toISOString().split('T')[0] : null,
          source_url: 'https://www.minneapolismn.gov/resident-services/housing/rental-housing/',
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
    if (offset > 100000) break
  }

  return result
}

function buildTitle(row: any): string {
  const t = row.complainttype ?? row.violationdescription ?? row.statusdesc ?? 'Code Complaint'
  return `Minneapolis: ${t}`.slice(0, 150)
}
function mapSeverity(v: string | null): string {
  if (!v) return 'medium'
  const u = v.toLowerCase()
  if (u.includes('immedi') || u.includes('emergency') || u.includes('high')) return 'high'
  if (u.includes('low') || u.includes('minor') || u.includes('routine')) return 'low'
  return 'medium'
}
function mapStatus(v: string | null): string {
  if (!v) return 'open'
  const u = v.toLowerCase()
  if (u.includes('closed') || u.includes('compli') || u.includes('resolved')) return 'closed'
  if (u.includes('dismiss') || u.includes('withdrawn')) return 'dismissed'
  return 'open'
}
