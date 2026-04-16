import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  reviewId: z.string().uuid(),
  reason: z.enum(['fake', 'defamatory', 'personal_info', 'spam', 'harassment', 'other']),
  note: z.string().max(500).optional(),
})

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid' }, { status: 422 })

  const { reviewId, reason, note } = parsed.data

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

  return NextResponse.json({ ok: true })
}
