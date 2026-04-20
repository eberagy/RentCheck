/**
 * CourtListener API v4 — Federal Court Cases
 * Docs: https://www.courtlistener.com/help/api/rest/v4/
 * Searches for eviction-related federal cases
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveOrQueueLandlord, type SyncResult } from './utils'

const BASE_URL = 'https://www.courtlistener.com/api/rest/v4'

export async function syncCourtListener(supabase: SupabaseClient): Promise<SyncResult> {
  const result: SyncResult = { added: 0, updated: 0, skipped: 0, errors: [] }

  const token = process.env.COURT_LISTENER_TOKEN
  if (!token) {
    result.errors.push('COURT_LISTENER_TOKEN not configured. Get a free token at courtlistener.com/register/')
    return result
  }

  const headers: Record<string, string> = {
    'Authorization': `Token ${token}`,
    'Content-Type': 'application/json',
  }

  // Verify token works before proceeding
  const authCheck = await fetch(`${BASE_URL}/dockets/?format=json&page_size=1`, { headers, signal: AbortSignal.timeout(10000) })
    .catch(() => null)
  if (!authCheck?.ok) {
    result.errors.push(`CourtListener auth failed (HTTP ${authCheck?.status ?? 'network error'}). Verify COURT_LISTENER_TOKEN in Vercel env vars.`)
    return result
  }

  // Search for housing/eviction related cases filed in the last 30 days
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const queries = [
    'eviction landlord',
    'unlawful detainer',
    'housing code violation',
    'habitability tenant',
  ]

  for (const q of queries) {
    let url: string | null = `${BASE_URL}/search/?q=${encodeURIComponent(q)}&type=r&filed_after=${since}&format=json`

    while (url) {
      const res: Response = await fetch(url, { headers })
      if (!res.ok) { result.errors.push(`CourtListener HTTP ${res.status} for "${q}"`); break }

      const data = await res.json()
      const results: any[] = data.results ?? []

      for (const item of results) {
        try {
          const sourceId = String(item.id ?? item.docket_id ?? '')
          if (!sourceId) { result.skipped++; continue }

          // Try to extract party name from case name for landlord resolution
          const caseName: string = item.caseName ?? item.case_name ?? ''
          const partyNames = caseName.split(/\s+v\.?\s+/i)
          const respondentName = partyNames[1]?.trim() ?? null

          let landlordId = null
          if (respondentName) {
            landlordId = await resolveOrQueueLandlord(supabase, respondentName)
          }

          const { error } = await supabase.from('public_records').upsert({
            source: 'court_listener',
            source_id: sourceId,
            record_type: 'court_case',
            landlord_id: landlordId,
            title: buildCourtTitle(caseName, item.docket_number ?? item.id ?? null),
            description: caseName || item.text?.slice(0, 500) || null,
            severity: 'high',
            status: item.dateFiled ? 'open' : 'unknown',
            filed_date: item.dateFiled ?? item.filed_date ?? null,
            source_url: item.absolute_url ? `https://www.courtlistener.com${item.absolute_url}` : null,
            raw_data: { id: item.id, caseName, court: item.court, dateFiled: item.dateFiled },
          }, { onConflict: 'source,source_id', ignoreDuplicates: true })

          if (error) { result.errors.push(error.message); continue }
          result.added++
        } catch (e) {
          result.errors.push(e instanceof Error ? e.message : String(e))
        }
      }

      url = data.next ?? null
      // Max 3 pages per query to avoid rate limits
      if (result.added > 300) break
    }
  }

  return result
}

function buildCourtTitle(caseName: string, docketNumber: string | null): string {
  const label = [caseName, docketNumber ? `#${docketNumber}` : null].filter(Boolean).join(' ')
  return `Court Case: ${label || 'Housing Matter'}`.slice(0, 150)
}
