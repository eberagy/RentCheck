import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const rl = rateLimit(`delete-account:${user.id}`, 2, 3600_000)
  if (!rl.success) return rateLimitResponse()

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Type "DELETE MY ACCOUNT" exactly to confirm.' }, { status: 422 })
  }

  // Admins can't self-delete. They'd lose access to the moderation queue
  // before we could audit the hand-off. Ask them to email support first.
  const { data: profile } = await supabase.from('profiles').select('user_type').eq('id', user.id).single()
  if (profile?.user_type === 'admin') {
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
  await Promise.all([
    service.from('watchlist').delete().eq('user_id', user.id),
    service.from('landlord_claims').delete().eq('claimed_by', user.id),
    service.from('landlord_submissions').delete().eq('submitted_by', user.id),
    service.from('record_disputes').delete().eq('disputed_by', user.id),
    service.from('review_flags').delete().eq('flagged_by', user.id),
    service.from('saved_searches').delete().eq('user_id', user.id),
    service.from('response_templates').delete().eq('created_by', user.id),
    // review_helpful_votes may or may not exist depending on migrations; tolerate.
    (async () => {
      try { await service.from('review_helpful_votes').delete().eq('user_id', user.id) }
      catch { /* table may not exist yet */ }
    })(),
  ])

  // 4. Strip reviewer PII on reviews — this is what "anonymize" means.
  // FK is already SET NULL on delete, but we explicitly null it here so the
  // reviews row survives the auth.users delete below without racing.
  await service
    .from('reviews')
    .update({ reviewer_id: null })
    .eq('reviewer_id', user.id)

  // 5. Delete the profile row. This is the point of no return.
  await service.from('profiles').delete().eq('id', user.id)

  // 6. Delete the Supabase Auth user. Without this the user could sign in
  // again with the same identity provider and see a broken account.
  try {
    await service.auth.admin.deleteUser(user.id)
  } catch (err) {
    console.error('[me/delete] auth admin delete failed:', err)
  }

  // 7. Sign out any active session on this device.
  await supabase.auth.signOut()

  return NextResponse.json({ ok: true })
}
