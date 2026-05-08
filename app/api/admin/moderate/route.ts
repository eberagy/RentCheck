import { NextRequest, NextResponse } from 'next/server'
import { assertSameOrigin } from '@/lib/origin'
import { dbError } from '@/lib/api-errors'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/admin-auth'
import { sendReviewApprovedEmail, sendReviewRejectedEmail, sendWatchlistAlertEmail } from '@/lib/email'
import { logAdminAction } from '@/lib/audit'
import { createUnsubscribeToken } from '@/lib/unsubscribe-token'
import { captureException } from '@/lib/sentry'
import { z } from 'zod'

const schema = z.object({
  reviewId: z.string().uuid(),
  action: z.enum(['approved', 'rejected']),
  adminNotes: z.string().max(1000).optional(),
})

export async function POST(req: NextRequest) {
  const csrf = assertSameOrigin(req)
  if (csrf) return csrf

  const supabase = await createClient()
  const user = await requireAdmin(supabase)
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid' }, { status: 422 })

  const { reviewId, action, adminNotes } = parsed.data

  // Get review + reviewer + landlord info before updating
  const serviceClient = createServiceClient()
  const { data: review, error: reviewErr } = await serviceClient
    .from('reviews')
    .select('id, title, reviewer_id, landlord_id, lease_verified, reviewer:profiles!reviews_reviewer_id_fkey(full_name, email), landlord:landlords(display_name, slug)')
    .eq('id', reviewId)
    .single()
  // Real DB error: refuse to proceed. The lease_verified gate below
  // would otherwise treat any error case as "lease not verified" and
  // refuse to approve — which is fine for action=approved but for
  // action=rejected we'd silently update the row blind. Surface the
  // failure either way.
  if (reviewErr && reviewErr.code !== 'PGRST116') return dbError('admin/moderate:lookup', reviewErr)

  if (action === 'approved' && !review?.lease_verified) {
    return NextResponse.json({ error: 'Lease must be verified before a review can be approved' }, { status: 409 })
  }

  const { error } = await supabase
    .from('reviews')
    .update({
      status: action,
      admin_notes: adminNotes ?? null,
      moderated_by: user.id,
      moderated_at: new Date().toISOString(),
    })
    .eq('id', reviewId)

  if (error) return dbError('admin/moderate:update', error)

  logAdminAction({
    adminId: user.id,
    actionType: action === 'approved' ? 'review.approved' : 'review.rejected',
    resourceType: 'review',
    resourceId: reviewId,
    subjectUserId: review?.reviewer_id ?? undefined,
    detail: adminNotes ? { adminNotes } : undefined,
  })

  // Send email to reviewer (non-blocking)
  if (review) {
    const reviewer = (review.reviewer as unknown) as { full_name: string | null; email: string | null } | null
    const landlord = (review.landlord as unknown) as { display_name: string; slug: string } | null

    if (reviewer?.email && landlord) {
      if (action === 'approved') {
        sendReviewApprovedEmail(reviewer.email, {
          firstName: reviewer.full_name?.split(' ')[0],
          reviewTitle: review.title ?? 'Your review',
          landlordName: landlord.display_name,
          landlordSlug: landlord.slug,
        }).catch(err => console.error('[email] review-approved failed:', err))

        // Fire watchlist alerts for users watching this landlord (excluding the reviewer).
        // .catch logs to Vercel; capture to Sentry too so a fan-out
        // failure (Resend rate-limit, watchers query timeout) shows up
        // alongside the rest of the review-approval failure modes
        // instead of disappearing into logs.
        fireWatchlistAlerts(serviceClient, review.landlord_id, landlord.display_name, landlord.slug, review.title ?? 'A new review', review.reviewer_id ?? null).catch(err => {
          console.error('[watchlist] alert fan-out failed:', err)
          captureException(err, { where: 'admin/moderate:fireWatchlistAlerts', landlordId: review.landlord_id })
        })
      } else {
        sendReviewRejectedEmail(reviewer.email, {
          firstName: reviewer.full_name?.split(' ')[0],
          reviewTitle: review.title ?? 'Your review',
          reason: adminNotes,
        }).catch(err => console.error('[email] review-rejected failed:', err))
      }
    }
  }

  return NextResponse.json({ ok: true })
}

async function fireWatchlistAlerts(
  serviceClient: ReturnType<typeof createServiceClient>,
  landlordId: string,
  landlordName: string,
  landlordSlug: string,
  summary: string,
  excludeUserId: string | null
) {
  // Get all users watching this landlord. Skip the reviewer themselves so
  // they don't receive an alert about their own approved review.
  let query = serviceClient
    .from('watchlist')
    .select('user_id, notify_email, user:profiles(full_name, email, email_watchlist)')
    .eq('landlord_id', landlordId)
  if (excludeUserId) query = query.neq('user_id', excludeUserId)
  const { data: watchers, error: watchersErr } = await query

  // Without surfacing the .error here, a watchers query failure looks
  // identical to "nobody watching this landlord" — the alert fan-out
  // silently skips and no Sentry breadcrumb gets dropped.
  if (watchersErr) {
    captureException(watchersErr, { where: 'admin/moderate:watchers-fanout-query', landlordId })
  }
  if (!watchers?.length) return

  for (const watcher of watchers) {
    const profile = (watcher.user as unknown) as { full_name: string | null; email: string | null; email_watchlist: boolean } | null
    if (!profile?.email || profile.email_watchlist === false || watcher.notify_email === false) continue
    sendWatchlistAlertEmail(profile.email, {
      firstName: profile.full_name?.split(' ')[0],
      landlordName,
      landlordSlug,
      alertType: 'new_review',
      summary,
      unsubscribeToken: createUnsubscribeToken(watcher.user_id as string),
    }).catch(err => console.error('[email] watchlist-alert failed:', err))
  }
}
