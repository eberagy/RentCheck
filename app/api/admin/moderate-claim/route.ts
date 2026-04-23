import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendClaimApprovedEmail, sendClaimRejectedEmail } from '@/lib/email'
import { z } from 'zod'

const schema = z.object({
  claimId: z.string().uuid(),
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
  const admin = await requireAdmin(supabase)
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid' }, { status: 422 })

  const { claimId, action, adminNotes } = parsed.data

  const serviceClient = createServiceClient()

  // Fetch claim with relations
  const { data: claim } = await serviceClient
    .from('landlord_claims')
    .select('id, claimed_by, landlord_id, landlord:landlords(id, display_name, slug), claimer:profiles!landlord_claims_claimed_by_fkey(full_name, email)')
    .eq('id', claimId)
    .single()

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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const landlord = (claim.landlord as unknown) as { id: string; display_name: string; slug: string } | null
  const claimer = (claim.claimer as unknown) as { full_name: string | null; email: string | null } | null

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
