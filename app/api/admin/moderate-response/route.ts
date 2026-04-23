import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendResponseApprovedEmail, sendResponseRejectedEmail } from '@/lib/email'
import { logAdminAction } from '@/lib/audit'
import { z } from 'zod'

const schema = z.object({
  reviewId: z.string().uuid(),
  action: z.enum(['approved', 'rejected']),
  adminNotes: z.string().max(1000).optional(),
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

  const { reviewId, action, adminNotes } = parsed.data

  const serviceClient = createServiceClient()
  const { data: review } = await serviceClient
    .from('reviews')
    .select('id, title, landlord:landlords(display_name, slug, claimed_by)')
    .eq('id', reviewId)
    .single()

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

  logAdminAction({
    adminId: user.id,
    actionType: action === 'approved' ? 'response.approved' : 'response.rejected',
    resourceType: 'review',
    resourceId: reviewId,
    detail: adminNotes ? { adminNotes } : undefined,
  })

  if (review) {
    const landlord = (review.landlord as unknown) as
      { display_name: string; slug: string; claimed_by: string | null } | null

    if (landlord?.claimed_by) {
      const { data: owner } = await serviceClient
        .from('profiles')
        .select('email, full_name')
        .eq('id', landlord.claimed_by)
        .single()

      if (owner?.email) {
        if (action === 'approved') {
          sendResponseApprovedEmail(owner.email, {
            firstName: owner.full_name?.split(' ')[0],
            landlordName: landlord.display_name,
            landlordSlug: landlord.slug,
            reviewTitle: review.title ?? undefined,
          }).catch(err => console.error('[email] response-approved error:', err))
        } else {
          sendResponseRejectedEmail(owner.email, {
            firstName: owner.full_name?.split(' ')[0],
            landlordName: landlord.display_name,
            reason: adminNotes,
          }).catch(err => console.error('[email] response-rejected error:', err))
        }
      }
    }
  }

  return NextResponse.json({ ok: true })
}
