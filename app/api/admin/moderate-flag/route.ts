import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { logAdminAction } from '@/lib/audit'
import { z } from 'zod'

const schema = z.object({
  action: z.enum(['dismiss', 'remove_review']),
  flagId: z.string().uuid().optional(),
  reviewId: z.string().uuid().optional(),
})

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('user_type').eq('id', user.id).single()
  return profile?.user_type === 'admin' ? user : null
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const admin = await requireAdmin(supabase)
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid' }, { status: 422 })

  const { action, flagId, reviewId } = parsed.data
  const service = createServiceClient()

  if (action === 'dismiss') {
    if (!flagId) return NextResponse.json({ error: 'flagId required' }, { status: 422 })
    const { error } = await service.from('review_flags').delete().eq('id', flagId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    logAdminAction({
      adminId: admin.id,
      actionType: 'flag.dismissed',
      resourceType: 'review_flag',
      resourceId: flagId,
    })
    return NextResponse.json({ ok: true })
  }

  if (action === 'remove_review') {
    if (!reviewId) return NextResponse.json({ error: 'reviewId required' }, { status: 422 })
    const { error: updErr } = await service.from('reviews').update({ status: 'flagged' }).eq('id', reviewId)
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })
    await service.from('review_flags').delete().eq('review_id', reviewId)
    logAdminAction({
      adminId: admin.id,
      actionType: 'flag.review_removed',
      resourceType: 'review',
      resourceId: reviewId,
    })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 422 })
}
