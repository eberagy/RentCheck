/**
 * Baltimore Vacant Building Notices (Open)
 * API: https://egisdata.baltimorecity.gov/egis/rest/services/Housing/DHCD_Open_Baltimore_Datasets/FeatureServer/1/query
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeAddress, resolveProperty, type SyncResult } from './utils'

const ENDPOINT = 'https://egisdata.baltimorecity.gov/egis/rest/services/Housing/DHCD_Open_Baltimore_Datasets/FeatureServer/1/query'
const PAGE_SIZE = 500

type BaltimoreFeature = {
  attributes?: {
    NoticeNum?: string | null
    DateNotice?: number | null
    DateCancel?: number | null
    DateAbate?: number | null
    OWNER_ABBR?: string | null
    Neighborhood?: string | null
    BLOCKLOT?: string | null
    Address?: string | null
  }
}

export async function syncBaltimore(supabase: SupabaseClient): Promise<SyncResult> {
  const result: SyncResult = { added: 0, updated: 0, skipped: 0, errors: [] }
  const sinceMs = Date.now() - 2 * 24 * 60 * 60 * 1000
  let offset = 0

  while (true) {
    const params = new URLSearchParams({
      where: '1=1',
      outFields: 'NoticeNum,DateNotice,DateCancel,DateAbate,OWNER_ABBR,Neighborhood,BLOCKLOT,Address',
      orderByFields: 'DateNotice DESC',
      resultOffset: String(offset),
      resultRecordCount: String(PAGE_SIZE),
      f: 'json',
    })

    const res = await fetch(`${ENDPOINT}?${params.toString()}`)
    if (!res.ok) {
      result.errors.push(`HTTP ${res.status}: ${await res.text()}`)
      break
    }

    const json: { features?: BaltimoreFeature[] } = await res.json()
    const features = json.features ?? []
    if (features.length === 0) break

    let reachedOlderRecords = false

    for (const feature of features) {
      try {
        const row = feature.attributes
        const noticeDate = row?.DateNotice ?? null

        if (!row?.NoticeNum || !row.Address || !noticeDate) {
          result.skipped++
          continue
        }

        if (noticeDate < sinceMs) {
          reachedOlderRecords = true
          continue
        }

        const addressNormalized = normalizeAddress(row.Address)
        let propertyId = await resolveProperty(supabase, addressNormalized, 'Baltimore', 'MD')

        if (!propertyId) {
          const { data: property } = await supabase
            .from('properties')
            .insert({
              address_line1: row.Address,
              city: 'Baltimore',
              state: 'Maryland',
              state_abbr: 'MD',
              zip: '',
              address_normalized: addressNormalized,
            })
            .select('id')
            .single()
          propertyId = property?.id ?? null
        }

        const { error } = await supabase.from('public_records').upsert({
          source: 'baltimore_vacants',
          source_id: row.NoticeNum,
          source_url: 'https://egisdata.baltimorecity.gov/egis/rest/services/Housing/DHCD_Open_Baltimore_Datasets/FeatureServer/1',
          record_type: 'baltimore_vacant_notice',
          property_id: propertyId,
          title: buildBaltimoreTitle(row.Address, row.Neighborhood),
          description: buildBaltimoreDescription(row),
          severity: 'high',
          status: row.DateCancel || row.DateAbate ? 'closed' : 'open',
          filed_date: formatArcGisDate(row.DateNotice),
          closed_date: formatArcGisDate(row.DateCancel ?? row.DateAbate ?? null),
          raw_data: row,
        }, { onConflict: 'source,source_id', ignoreDuplicates: false })

        if (error) {
          result.errors.push(error.message)
          continue
        }

        result.added++
      } catch (error) {
        result.errors.push(error instanceof Error ? error.message : String(error))
      }
    }

    offset += PAGE_SIZE
    if (features.length < PAGE_SIZE || reachedOlderRecords) break
  }

  return result
}

function formatArcGisDate(value: number | null | undefined) {
  if (!value) return null
  return new Date(value).toISOString().split('T')[0]
}

function buildBaltimoreTitle(address: string, neighborhood: string | null | undefined) {
  const label = neighborhood ? `${address} (${neighborhood})` : address
  return `Baltimore Vacant Building Notice: ${label}`.slice(0, 150)
}

function buildBaltimoreDescription(row: NonNullable<BaltimoreFeature['attributes']>) {
  const parts = [`Open vacant building notice for ${row.Address}`]
  if (row.Neighborhood) parts.push(`Neighborhood: ${row.Neighborhood}`)
  if (row.BLOCKLOT) parts.push(`Block/Lot: ${row.BLOCKLOT}`)
  if (row.OWNER_ABBR) parts.push(`Owner code: ${row.OWNER_ABBR}`)
  return parts.join(' — ')
}
