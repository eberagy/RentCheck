import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { logAdminAction } from '@/lib/audit'
import { z } from 'zod'

const schema = z.object({
  reviewId: z.string().uuid(),
  verified: z.boolean(),
  rejectionReason: z.string().max(1000).optional(),
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

  const { reviewId, verified, rejectionReason } = parsed.data
  const now = new Date().toISOString()

  const updates: Record<string, unknown> = {
    lease_verified: verified,
    lease_verified_at: now,
    lease_verified_by: admin.id,
  }
  if (!verified) {
    const reason = rejectionReason ?? 'Document could not be verified'
    updates.lease_rejection_reason = reason
    updates.status = 'rejected'
    updates.admin_notes = reason
    updates.moderated_at = now
    updates.moderated_by = admin.id
  }

  const service = createServiceClient()
  const { error } = await service.from('reviews').update(updates).eq('id', reviewId)
  if (error) { console.error("[db]", error); return NextResponse.json({ error: "Database error" }, { status: 500 }) }

  logAdminAction({
    adminId: admin.id,
    actionType: verified ? 'lease.verified' : 'lease.rejected',
    resourceType: 'review',
    resourceId: reviewId,
    detail: !verified && rejectionReason ? { rejectionReason } : undefined,
  })

  return NextResponse.json({ ok: true })
}
