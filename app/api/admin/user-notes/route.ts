import { NextRequest, NextResponse } from 'next/server'
import { assertSameOrigin } from '@/lib/origin'
import { dbError } from '@/lib/api-errors'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/admin-auth'
import { sanitizeText } from '@/lib/sanitize'
import { logAdminAction } from '@/lib/audit'
import { z } from 'zod'

const schema = z.object({
  userId: z.string().uuid(),
  notes: z.string().max(4000),
})

export async function POST(req: NextRequest) {
  const csrf = assertSameOrigin(req)
  if (csrf) return csrf

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
  if (error) return dbError('admin/user-notes:update', error)

  logAdminAction({
    adminId: admin.id,
    actionType: 'user.note_updated',
    resourceType: 'profile',
    resourceId: parsed.data.userId,
    subjectUserId: parsed.data.userId,
    detail: { length: clean.length },
  })

  return NextResponse.json({ ok: true })
}
