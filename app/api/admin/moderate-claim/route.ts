import { NextRequest, NextResponse } from 'next/server'
import { assertSameOrigin } from '@/lib/origin'
import { dbError } from '@/lib/api-errors'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/admin-auth'
import { sendClaimApprovedEmail, sendClaimRejectedEmail } from '@/lib/email'
import { logAdminAction } from '@/lib/audit'
import { z } from 'zod'

const schema = z.object({
  claimId: z.string().uuid(),
  action: z.enum(['approved', 'rejected']),
  adminNotes: z.string().max(1000).optional(),
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

  const { claimId, action, adminNotes } = parsed.data

  const serviceClient = createServiceClient()

  // Fetch claim with relations. Same PGRST116 split as the rest of
  // the API — moderators were getting confused 404s on transient DB
  // errors when the claim row in question still existed.
  const { data: claim, error: claimErr } = await serviceClient
    .from('landlord_claims')
    .select('id, claimed_by, landlord_id, landlord:landlords(id, display_name, slug), claimer:profiles!landlord_claims_claimed_by_fkey(full_name, email)')
    .eq('id', claimId)
    .single()

  if (claimErr && claimErr.code !== 'PGRST116') return dbError('admin/moderate-claim:lookup', claimErr)
  if (!claim) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Update claim status
  const { error } = await serviceClient
    .from('landlord_claims')
    .update({
      status: action,
      admin_notes: adminNotes ?? null,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', claimId)

  if (error) return dbError('admin/moderate-claim:update', error)

  const landlord = (claim.landlord as unknown) as { id: string; display_name: string; slug: string } | null
  const claimer = (claim.claimer as unknown) as { full_name: string | null; email: string | null } | null

  logAdminAction({
    adminId: admin.id,
    actionType: action === 'approved' ? 'claim.approved' : 'claim.rejected',
    resourceType: 'landlord_claim',
    resourceId: claimId,
    subjectUserId: claim.claimed_by,
    detail: { landlordId: landlord?.id, landlordName: landlord?.display_name, adminNotes },
  })

  if (action === 'approved') {
    if (landlord) {
      // Mark landlord as claimed and verified
      await serviceClient
        .from('landlords')
        .update({ is_claimed: true, is_verified: true, claimed_by: claim.claimed_by, claimed_at: new Date().toISOString() })
        .eq('id', landlord.id)

      // Promote the claimer to landlord user_type so the navbar surfaces the portal link.
      // Only upgrade — never downgrade an admin.
      await serviceClient
        .from('profiles')
        .update({ user_type: 'landlord' })
        .eq('id', claim.claimed_by)
        .neq('user_type', 'admin')

      if (claimer?.email) {
        sendClaimApprovedEmail(claimer.email, {
          firstName: claimer.full_name?.split(' ')[0],
          landlordName: landlord.display_name,
          landlordSlug: landlord.slug,
        }).catch(err => console.error('[email] claim-approved error:', err))
      }
    }
  } else if (action === 'rejected') {
    if (landlord && claimer?.email) {
      sendClaimRejectedEmail(claimer.email, {
        firstName: claimer.full_name?.split(' ')[0],
        landlordName: landlord.display_name,
        reason: adminNotes,
      }).catch(err => console.error('[email] claim-rejected error:', err))
    }
  }

  return NextResponse.json({ ok: true })
}
