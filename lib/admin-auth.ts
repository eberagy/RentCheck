import type { createClient } from '@/lib/supabase/server'
import { captureException } from '@/lib/sentry'

type ServerSupabase = Awaited<ReturnType<typeof createClient>>

/**
 * Resolve the current user iff they're an admin.
 *
 * Returns the user object on success, null on any other case (signed out,
 * not admin, or transient profile-lookup failure). Routes should treat
 * null as 403 — failing closed is the right behavior since the consequence
 * of a false positive (granting admin to a non-admin) would be far worse
 * than a false negative (admin retries).
 *
 * Profile lookup errors that aren't PGRST116 ("no rows") are captured to
 * Sentry so we know when transient DB failures are hiding admin auth.
 *
 * Used by every /api/admin/* mutation route — see commit history before
 * editing for the duplication this consolidated.
 */
export async function requireAdmin(supabase: ServerSupabase) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('user_type')
    .eq('id', user.id)
    .single()
  // PGRST116 = "no rows returned" — that's the legitimate "user has
  // no profile row" case. Anything else (network, RLS regression) is
  // a real failure worth knowing about; without surfacing, an admin
  // would just see an unexplained 403.
  if (error && error.code !== 'PGRST116') {
    captureException(error, { where: 'requireAdmin', userId: user.id })
    return null
  }
  return profile?.user_type === 'admin' ? user : null
}
