import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendReviewApprovedEmail, sendReviewRejectedEmail, sendWatchlistAlertEmail } from '@/lib/email'
import { logAdminAction } from '@/lib/audit'
import { z } from 'zod'

const schema = z.object({
  reviewId: z.string().uuid(),
  action: z.enum(['approved', 'rejected']),
  adminNotes: z.string().max(1000).optional(),
})

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('user_type').eq('id', user.id).single()
  return profile?.user_type === 'admin' ? user : null
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const user = await requireAdmin(supabase)
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid' }, { status: 422 })

  const { reviewId, action, adminNotes } = parsed.data

  // Get review + reviewer + landlord info before updating
  const serviceClient = createServiceClient()
  const { data: review } = await serviceClient
    .from('reviews')
    .select('id, title, reviewer_id, landlord_id, lease_verified, reviewer:profiles!reviews_reviewer_id_fkey(full_name, email), landlord:landlords(display_name, slug)')
    .eq('id', reviewId)
    .single()

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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

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
        }).catch(console.error)

        // Fire watchlist alerts for users watching this landlord
        fireWatchlistAlerts(serviceClient, review.landlord_id, landlord.display_name, landlord.slug, review.title ?? 'A new review').catch(console.error)
      } else {
        sendReviewRejectedEmail(reviewer.email, {
          firstName: reviewer.full_name?.split(' ')[0],
          reviewTitle: review.title ?? 'Your review',
          reason: adminNotes,
        }).catch(console.error)
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
  summary: string
) {
  // Get all users watching this landlord (excluding the reviewer themselves)
  const { data: watchers } = await serviceClient
    .from('watchlist')
    .select('user_id, notify_email, user:profiles(full_name, email, email_watchlist)')
    .eq('landlord_id', landlordId)

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
    }).catch(console.error)
  }
}
