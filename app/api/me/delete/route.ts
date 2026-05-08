import { NextRequest, NextResponse } from 'next/server'
import { assertSameOrigin } from '@/lib/origin'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { captureException } from '@/lib/sentry'
import { z } from 'zod'

// POST /api/me/delete
// Hard-deletes the user's profile + all owned rows EXCEPT public reviews,
// which are anonymized (reviewer_id → NULL via ON DELETE SET NULL) so
// public-interest review content survives while reviewer PII disappears.
//
// Body: { confirm: "DELETE MY ACCOUNT" } — literal string match required.
//
// CCPA §1798.105 / GDPR Art. 17 — right to deletion self-serve flow.
const schema = z.object({
  confirm: z.literal('DELETE MY ACCOUNT'),
})

export async function POST(req: NextRequest) {
  const csrf = assertSameOrigin(req)
  if (csrf) return csrf

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const rl = rateLimit(`delete-account:${user.id}`, 2, 3600_000)
  if (!rl.success) return rateLimitResponse(rl)

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Type "DELETE MY ACCOUNT" exactly to confirm.' }, { status: 422 })
  }

  // Admins can't self-delete. They'd lose access to the moderation queue
  // before we could audit the hand-off. Ask them to email support first.
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('user_type')
    .eq('id', user.id)
    .single()
  // Fail closed on any profile-lookup failure. Without splitting,
  // a transient DB error left profile=null and the `=== 'admin'`
  // check evaluated to false — letting an admin accidentally self-
  // delete during DB instability. PGRST116 ("no profile row") is also
  // unsafe to proceed on for the same reason: we can't confirm the
  // user is non-admin. 503 prompts the caller to retry.
  if (profileErr || !profile) {
    captureException(profileErr ?? new Error('me/delete: missing profile'), { where: 'me/delete:profile-lookup', userId: user.id })
    return NextResponse.json({ error: 'Could not verify account. Please retry in a moment.' }, { status: 503 })
  }
  if (profile.user_type === 'admin') {
    return NextResponse.json({ error: 'Admin accounts must be demoted by another admin before self-deletion. Email support@vettrentals.com.' }, { status: 403 })
  }

  const service = createServiceClient()

  // 1. Purge storage objects the user owns in folder `{user.id}/`.
  // Lease docs + verification docs + avatars all live under user-id folders.
  // Loop pages so users with >1000 historical uploads don't leave orphans.
  const buckets = ['lease-docs', 'landlord-verification-docs', 'avatars']
  for (const bucket of buckets) {
    try {
      let offset = 0
      const PAGE = 100
      while (offset < 10_000) {
        const { data: objects } = await service.storage
          .from(bucket)
          .list(user.id, { limit: PAGE, offset })
        if (!objects || objects.length === 0) break
        const paths = objects.map(o => `${user.id}/${o.name}`)
        await service.storage.from(bucket).remove(paths)
        if (objects.length < PAGE) break
        offset += PAGE
      }
    } catch (err) {
      console.error(`[me/delete] failed to purge ${bucket}:`, err)
      captureException(err, { where: 'me/delete:purge-bucket', bucket })
    }
  }

  // 2. Release any claimed landlords back to unclaimed — don't orphan them.
  await service
    .from('landlords')
    .update({ is_claimed: false, is_verified: false, claimed_by: null, claimed_at: null })
    .eq('claimed_by', user.id)

  // 3. Delete rows that don't cascade cleanly (some FK are SET NULL, some CASCADE).
  // Reviews: reviewer_id → SET NULL (review text stays, reviewer anonymized).
  // Everything else: owned by user, can be hard-deleted.
  const deleteOps = [
    { name: 'watchlist', op: service.from('watchlist').delete().eq('user_id', user.id) },
    { name: 'landlord_claims', op: service.from('landlord_claims').delete().eq('claimed_by', user.id) },
    { name: 'landlord_submissions', op: service.from('landlord_submissions').delete().eq('submitted_by', user.id) },
    { name: 'record_disputes', op: service.from('record_disputes').delete().eq('disputed_by', user.id) },
    { name: 'review_flags', op: service.from('review_flags').delete().eq('flagged_by', user.id) },
    { name: 'saved_searches', op: service.from('saved_searches').delete().eq('user_id', user.id) },
    { name: 'response_templates', op: service.from('response_templates').delete().eq('created_by', user.id) },
    // email_leads has no user_id; match by email so anon-path captures
    // get cleaned up too. Best-effort.
    {
      name: 'email_leads',
      op: user.email
        ? service.from('email_leads').delete().eq('email', user.email.toLowerCase())
        : Promise.resolve({ error: null }),
    },
  ]
  // GDPR/CCPA require completeness — silent .error meant a delete that
  // failed left rows the user thinks were purged. Capture per-table so
  // we can hand-cleanup the survivors instead of waiting for an audit.
  const deleteResults = await Promise.all(deleteOps.map(d => d.op))
  for (let i = 0; i < deleteResults.length; i++) {
    const r = deleteResults[i] as { error?: unknown } | undefined
    if (r?.error) captureException(r.error, { where: `me/delete:${deleteOps[i]!.name}`, userId: user.id })
  }
  // review_helpful_votes may or may not exist depending on migrations; tolerate.
  try { await service.from('review_helpful_votes').delete().eq('user_id', user.id) }
  catch { /* table may not exist yet */ }

  // 4. Strip reviewer PII on reviews — this is what "anonymize" means.
  // FK is already SET NULL on delete, but we explicitly null it here so the
  // reviews row survives the auth.users delete below without racing.
  const { error: anonErr } = await service
    .from('reviews')
    .update({ reviewer_id: null })
    .eq('reviewer_id', user.id)
  // Failure here is the worst kind of GDPR/CCPA gap — the user is
  // told their account is gone but reviews still link back to their
  // user_id. Capture so we can hand-fix.
  if (anonErr) captureException(anonErr, { where: 'me/delete:reviews-anonymize', userId: user.id })

  // 5. Delete the profile row. This is the point of no return.
  const { error: profileDelErr } = await service.from('profiles').delete().eq('id', user.id)
  if (profileDelErr) captureException(profileDelErr, { where: 'me/delete:profile-delete', userId: user.id })

  // 6. Delete the Supabase Auth user. Without this the user could sign in
  // again with the same identity provider and see a broken account.
  try {
    await service.auth.admin.deleteUser(user.id)
  } catch (err) {
    // High-stakes failure — the profile row + storage are already gone, so
    // the user's data is purged, but the auth.users row lingers. Without
    // Sentry visibility we'd only learn about it via "I deleted my account
    // but I can still sign in" support emails.
    console.error('[me/delete] auth admin delete failed:', err)
    captureException(err, { where: 'me/delete:auth-admin-delete' })
  }

  // 7. Sign out any active session on this device.
  await supabase.auth.signOut()

  return NextResponse.json({ ok: true })
}
