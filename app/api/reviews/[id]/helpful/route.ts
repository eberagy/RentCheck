import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

export async function PATCH(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in to mark reviews helpful' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('is_banned').eq('id', user.id).single()
  if (profile?.is_banned) return NextResponse.json({ error: 'Account suspended' }, { status: 403 })

  // Rate limit: 30 votes per minute per user
  const rl = rateLimit(`helpful:${user.id}`, 30, 60_000)
  if (!rl.success) return rateLimitResponse()

  const { data: voted, error } = await supabase.rpc('toggle_helpful_vote', {
    p_review_id: id,
    p_user_id: user.id,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: review } = await supabase
    .from('reviews')
    .select('helpful_count')
    .eq('id', id)
    .single()

  return NextResponse.json({ voted, helpful_count: review?.helpful_count ?? 0 })
}
