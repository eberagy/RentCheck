import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { z } from 'zod'

// PATCH /api/reviews/[id]/privacy
// Toggles is_anonymous on a review the caller owns. Allowed even for
// approved reviews — flipping privacy doesn't affect moderation-relevant
// content. The main /api/reviews/[id] PATCH is locked to pending reviews
// because it can change rating + body, which would re-open moderation.
const schema = z.object({ isAnonymous: z.boolean() })

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const rl = rateLimit(`review-privacy:${user.id}`, 30, 3600_000)
  if (!rl.success) return rateLimitResponse()

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 422 })

  const service = createServiceClient()
  const { data: review } = await service
    .from('reviews')
    .select('id, reviewer_id')
    .eq('id', id)
    .single()
  if (!review) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (review.reviewer_id !== user.id) return NextResponse.json({ error: 'Not yours' }, { status: 403 })

  // Don't bump updated_at — privacy is metadata, not content. Bumping
  // updated_at would jump the review on "Most recent" sorts every time
  // the user toggles the pill.
  const { error } = await service
    .from('reviews')
    .update({ is_anonymous: parsed.data.isAnonymous })
    .eq('id', id)

  if (error) {
    console.error('[db]', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
  return NextResponse.json({ ok: true, isAnonymous: parsed.data.isAnonymous })
}
