import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { logAdminAction } from '@/lib/audit'
import { z } from 'zod'

const schema = z.object({
  userId: z.string().uuid(),
  userType: z.enum(['admin', 'renter', 'landlord']),
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

  const { userId, userType } = parsed.data

  const serviceClient = createServiceClient()
  const { error } = await serviceClient
    .from('profiles')
    .update({ user_type: userType })
    .eq('id', userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  logAdminAction({
    adminId: admin.id,
    actionType: 'user.promoted',
    resourceType: 'profile',
    resourceId: userId,
    subjectUserId: userId,
    detail: { userType },
  })

  return NextResponse.json({ ok: true })
}
