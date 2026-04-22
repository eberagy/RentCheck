import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  reviewId: z.string().uuid(),
  action: z.enum(['approved', 'rejected']),
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

  const { reviewId, action } = parsed.data

  const updates: Record<string, unknown> = {
    landlord_response_status: action,
    landlord_response_at: action === 'approved' ? new Date().toISOString() : null,
  }

  if (action === 'rejected') {
    updates.landlord_response = null
    updates.landlord_response_status = 'rejected'
  }

  const { error } = await supabase
    .from('reviews')
    .update(updates)
    .eq('id', reviewId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
