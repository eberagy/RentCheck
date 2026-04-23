import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { sanitizeText } from '@/lib/sanitize'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

// Three independent users flagging the same review auto-hides it from the
// public feed (status → 'flagged') while it waits for human moderation.
// Keeps abuse amplification off the site overnight without requiring admins
// to chase every flag individually.
const AUTO_HIDE_FLAG_THRESHOLD = 3

const schema = z.object({
  reviewId: z.string().uuid(),
  reason: z.enum(['fake', 'defamatory', 'personal_info', 'spam', 'harassment', 'other']),
  note: z.string().max(500).optional(),
})

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('is_banned').eq('id', user.id).single()
  if (profile?.is_banned) return NextResponse.json({ error: 'Account suspended' }, { status: 403 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid' }, { status: 422 })

  // Rate limit: 10 flags per hour per user
  const rl = rateLimit(`flags:${user.id}`, 10, 3600_000)
  if (!rl.success) return rateLimitResponse()

  const { reviewId, reason, note: rawNote } = parsed.data
  const note = rawNote ? sanitizeText(rawNote) : undefined

  // Check review exists and is approved
  const { data: review } = await supabase
    .from('reviews')
    .select('id')
    .eq('id', reviewId)
    .eq('status', 'approved')
    .single()

  if (!review) return NextResponse.json({ error: 'Review not found' }, { status: 404 })

  // Check for duplicate flag
  const { data: existing } = await supabase
    .from('review_flags')
    .select('id')
    .eq('review_id', reviewId)
    .eq('flagged_by', user.id)
    .single()

  if (existing) return NextResponse.json({ error: 'You have already flagged this review' }, { status: 409 })

  const { error } = await supabase.from('review_flags').insert({
    review_id: reviewId,
    flagged_by: user.id,
    reason,
    note: note ?? null,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Escalation: distinct-user flag count at/above threshold → auto-hide.
  // Use service role so RLS on reviews doesn't stop the status update.
  void (async () => {
    try {
      const service = createServiceClient()
      const { count } = await service
        .from('review_flags')
        .select('flagged_by', { count: 'exact', head: true })
        .eq('review_id', reviewId)
      if ((count ?? 0) >= AUTO_HIDE_FLAG_THRESHOLD) {
        await service
          .from('reviews')
          .update({
            status: 'flagged',
            admin_notes: `Auto-hidden after ${count} flags (escalation threshold ${AUTO_HIDE_FLAG_THRESHOLD})`,
          })
          .eq('id', reviewId)
          .eq('status', 'approved')
      }
    } catch (err) {
      console.error('[flag] escalation check failed:', err)
    }
  })()

  return NextResponse.json({ ok: true })
}
