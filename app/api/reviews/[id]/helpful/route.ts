import { NextRequest, NextResponse } from 'next/server'
import { assertSameOrigin } from '@/lib/origin'
import { dbError } from '@/lib/api-errors'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const csrf = assertSameOrigin(req)
  if (csrf) return csrf

  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in to mark reviews helpful' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('is_banned').eq('id', user.id).single()
  if (profile?.is_banned) return NextResponse.json({ error: 'Account suspended' }, { status: 403 })

  // Rate limit: 30 votes per minute per user
  const rl = rateLimit(`helpful:${user.id}`, 30, 60_000)
  if (!rl.success) return rateLimitResponse(rl)

  const { data: voted, error } = await supabase.rpc('toggle_helpful_vote', {
    p_review_id: id,
    p_user_id: user.id,
  })
  if (error) return dbError('reviews/helpful:rpc', error)

  const { data: review, error: reviewErr } = await supabase
    .from('reviews')
    .select('helpful_count')
    .eq('id', id)
    .single()
  // The UI uses the returned count to update the button immediately;
  // a silently-dropped error here returned helpful_count: 0 even
  // though toggle_helpful_vote had already succeeded — making the
  // button visibly snap to 0 right after the user clicked it. Surface
  // the failure as a 500 so the client knows to refetch instead of
  // trusting the bogus zero.
  if (reviewErr) return dbError('reviews/helpful:reread', reviewErr)

  return NextResponse.json({ voted, helpful_count: review?.helpful_count ?? 0 })
}
