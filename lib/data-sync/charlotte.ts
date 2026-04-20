/**
 * Charlotte, NC — Code Enforcement Cases
 * API: https://opendata.charlottenc.gov (Socrata)
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveProperty, normalizeAddress, type SyncResult } from './utils'

const ENDPOINTS = [
  'https://opendata.charlottenc.gov/resource/bt3z-hwua.json', // Code enforcement
  'https://opendata.charlottenc.gov/resource/3n6j-jj7d.json', // Housing inspections
  'https://opendata.charlottenc.gov/resource/whut-9yxr.json', // Permits
]
const PAGE_SIZE = 1000

export async function syncCharlotte(supabase: SupabaseClient): Promise<SyncResult> {
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
    result.errors.push('No working Charlotte endpoint found')
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
        const sourceId = String(row.casenumber ?? row.case_number ?? row.id ?? '')
        if (!sourceId) { result.skipped++; continue }

        const addr = row.address ?? row.site_address ?? row.location ?? ''
        const addrNorm = normalizeAddress(addr)
        let propertyId = await resolveProperty(supabase, addrNorm, 'Charlotte', 'NC')
        if (!propertyId && addr) {
          const { data: newProp } = await supabase.from('properties').insert({
            address_line1: addr, city: 'Charlotte', state: 'North Carolina', state_abbr: 'NC',
            zip: row.zip ?? row.zipcode ?? '', address_normalized: addrNorm,
          }).select('id').single()
          propertyId = newProp?.id ?? null
        }

        const { error } = await supabase.from('public_records').upsert({
          source: 'charlotte_code',
          source_id: sourceId,
          record_type: 'charlotte_violation',
          property_id: propertyId,
          title: buildTitle(row),
          description: row.violationdescription ?? row.casetype ?? row.description ?? null,
          severity: mapSeverity(row.priority ?? row.violationclass),
          status: mapStatus(row.status ?? row.casestatus),
          filed_date: (row.opendate ?? row.violationdate) ? new Date(row.opendate ?? row.violationdate).toISOString().split('T')[0] : null,
          source_url: 'https://www.charlottenc.gov/Services/Code-Enforcement',
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
  const t = row.violationdescription ?? row.casetype ?? row.description ?? 'Code Violation'
  return `Charlotte: ${t}`.slice(0, 150)
}
function mapSeverity(v: string | null): string {
  if (!v) return 'medium'
  const u = v.toLowerCase()
  if (u.includes('high') || u.includes('immedi') || u.includes('critical') || u === 'a') return 'high'
  if (u.includes('low') || u.includes('minor') || u === 'c') return 'low'
  return 'medium'
}
function mapStatus(v: string | null): string {
  if (!v) return 'open'
  const u = v.toLowerCase()
  if (u.includes('closed') || u.includes('compli') || u.includes('resolved')) return 'closed'
  if (u.includes('dismiss') || u.includes('void') || u.includes('withdrawn')) return 'dismissed'
  return 'open'
}
