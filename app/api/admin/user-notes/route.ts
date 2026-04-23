import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sanitizeText } from '@/lib/sanitize'
import { logAdminAction } from '@/lib/audit'
import { z } from 'zod'

const schema = z.object({
  userId: z.string().uuid(),
  notes: z.string().max(4000),
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

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid' }, { status: 422 })

  const service = createServiceClient()
  const clean = sanitizeText(parsed.data.notes)
  const { error } = await service
    .from('profiles')
    .update({ admin_notes: clean || null })
    .eq('id', parsed.data.userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  logAdminAction({
    adminId: admin.id,
    actionType: 'user.promoted', // no dedicated "note edited" type — re-using closest; next migration adds 'user.note_updated'
    resourceType: 'profile',
    resourceId: parsed.data.userId,
    subjectUserId: parsed.data.userId,
    detail: { action: 'admin_notes_updated', length: clean.length },
  })

  return NextResponse.json({ ok: true })
}
