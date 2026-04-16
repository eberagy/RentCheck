import { createServiceClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface SyncResult {
  added: number
  updated: number
  skipped: number
  errors: string[]
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
