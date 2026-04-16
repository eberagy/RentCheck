import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in to mark reviews helpful' }, { status: 401 })

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
