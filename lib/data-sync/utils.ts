import { createServiceClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface SyncResult {
  added: number
  updated: number
  skipped: number
  errors: string[]
}

/** Simple retry wrapper — retries up to 3x on network errors */
export async function withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  let lastError: unknown
  for (let i = 0; i < retries; i++) {
    try { return await fn() } catch (e) {
      lastError = e
      if (i < retries - 1) await new Promise(r => setTimeout(r, 500 * (i + 1)))
    }
  }
  throw lastError
}

type RawRecord = {
  source: string
  source_id: string | null
  record_type: string
  status: string
  description: string | null
  address: string | null
  city: string
  state: string  // state abbreviation e.g. 'TN'
  filed_date: string | null
  closed_date?: string | null
  raw: Record<string, unknown>
}

const STATE_ABBR_TO_FULL: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  DC: 'District of Columbia',
}

/**
 * Upsert an array of raw public records into the database.
 * Handles property creation/lookup from address fields.
 * All new-city syncs should use this instead of writing their own upsert logic.
 */
export async function upsertRecords(
  supabase: SupabaseClient,
  records: RawRecord[]
): Promise<SyncResult> {
  const result: SyncResult = { added: 0, updated: 0, skipped: 0, errors: [] }

  for (const rec of records) {
    try {
      if (!rec.source_id) { result.skipped++; continue }

      const stateAbbr = rec.state.length === 2 ? rec.state.toUpperCase() : rec.state
      const stateFull = STATE_ABBR_TO_FULL[stateAbbr] ?? rec.state

      // Get or create property from address
      let propertyId: string | null = null
      if (rec.address?.trim()) {
        const addrNorm = normalizeAddress(rec.address)
        // Try to find existing
        const { data: existing } = await supabase
          .from('properties')
          .select('id')
          .eq('address_normalized', addrNorm)
          .eq('city', rec.city)
          .eq('state_abbr', stateAbbr)
          .limit(1)
          .maybeSingle()

        if (existing) {
          propertyId = existing.id
        } else {
          const { data: created } = await supabase
            .from('properties')
            .insert({
              address_line1: rec.address.trim(),
              city: rec.city,
              state: stateFull,
              state_abbr: stateAbbr,
              zip: '',
              address_normalized: addrNorm,
            })
            .select('id')
            .single()
          propertyId = created?.id ?? null
        }
      }

      // Build title (required, 10–150 chars)
      const rawTitle = rec.description
        ? `${rec.city} Code Violation: ${rec.description}`
        : `${rec.city} Code Enforcement Case`
      const title = rawTitle.slice(0, 150).padEnd(10, ' ')

      const { error } = await supabase.from('public_records').upsert({
        source: rec.source,
        source_id: rec.source_id,
        record_type: 'code_enforcement',
        property_id: propertyId,
        title,
        description: rec.description,
        severity: 'medium',
        status: rec.status,
        filed_date: rec.filed_date ? rec.filed_date.slice(0, 10) : null,
        closed_date: rec.closed_date ? rec.closed_date.slice(0, 10) : null,
        raw_data: rec.raw,
      }, { onConflict: 'source,source_id', ignoreDuplicates: false })

      if (error) { result.errors.push(error.message); continue }
      result.added++
    } catch (e) {
      result.errors.push(e instanceof Error ? e.message : String(e))
    }
  }

  return result
}

export async function withSyncLog(
  source: string,
  fn: (supabase: SupabaseClient) => Promise<SyncResult>
): Promise<SyncResult> {
  const supabase = createServiceClient()

  const { data: log } = await supabase
    .from('sync_log')
    .insert({ source, status: 'running', started_at: new Date().toISOString() })
    .select('id')
    .single()

  const logId = log?.id

  try {
    const result = await fn(supabase)
    if (logId) {
      await supabase.from('sync_log').update({
        status: 'success',
        finished_at: new Date().toISOString(),
        records_added: result.added,
        records_updated: result.updated,
        records_skipped: result.skipped,
        error_message: result.errors.length > 0 ? result.errors.slice(0, 3).join('; ') : null,
      }).eq('id', logId)
    }
    return result
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (logId) {
      await supabase.from('sync_log').update({
        status: 'error',
        finished_at: new Date().toISOString(),
        error_message: msg,
      }).eq('id', logId)
    }
    throw err
  }
}

/** Verify the request is from Vercel cron or an admin manual trigger */
export function verifyCronSecret(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const authHeader = req.headers.get('authorization')
  const cronHeader = req.headers.get('x-cron-secret')
  return authHeader === `Bearer ${secret}` || cronHeader === secret
}

/** Resolve a landlord by name using fuzzy matching. Returns id or null. */
export async function resolveOrQueueLandlord(
  supabase: SupabaseClient,
  name: string,
  city?: string,
  state?: string
): Promise<string | null> {
  if (!name) return null

  // Exact match first
  const { data: exact } = await supabase
    .from('landlords')
    .select('id')
    .ilike('display_name', name.trim())
    .limit(1)
    .single()

  if (exact) return exact.id

  // Fuzzy match via pg_trgm — requires similarity() support
  const { data: fuzzy } = await supabase
    .rpc('find_landlord_by_name', { input_name: name, input_city: city ?? null, min_similarity: 0.7 })
    .limit(1)
    .single()

  if (fuzzy) return (fuzzy as any).id

  return null
}

/** Resolve a property by normalized address. Returns id or null. */
export async function resolveProperty(
  supabase: SupabaseClient,
  addressNormalized: string,
  city: string,
  stateAbbr: string
): Promise<string | null> {
  const { data } = await supabase
    .from('properties')
    .select('id')
    .eq('address_normalized', addressNormalized.toLowerCase().trim())
    .eq('city', city)
    .eq('state_abbr', stateAbbr)
    .limit(1)
    .single()

  return data?.id ?? null
}

export function normalizeAddress(addr: string): string {
  return addr
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\bstreet\b/g, 'st')
    .replace(/\bavenue\b/g, 'ave')
    .replace(/\bboulevard\b/g, 'blvd')
    .replace(/\bdrive\b/g, 'dr')
    .replace(/\broad\b/g, 'rd')
    .replace(/\blane\b/g, 'ln')
    .replace(/\bcourt\b/g, 'ct')
    .replace(/\bplace\b/g, 'pl')
    .replace(/[.,#]/g, '')
    .trim()
}
