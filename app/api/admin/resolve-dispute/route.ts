import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendDisputeResolvedEmail } from '@/lib/email'
import { logAdminAction } from '@/lib/audit'
import { z } from 'zod'

const schema = z.object({
  disputeId: z.string().uuid(),
  decision: z.enum(['record_removed', 'record_updated', 'no_action', 'refer_to_source']),
  adminNotes: z.string().max(1000).optional(),
  recordId: z.string().uuid().optional(),
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

  const { disputeId, decision, adminNotes, recordId } = parsed.data
  const service = createServiceClient()

  // Look up submitter + record label before touching anything, for the email later
  const { data: dispute } = await service
    .from('record_disputes')
    .select('disputed_by, record:public_records(title, description)')
    .eq('id', disputeId)
    .single()

  const { error } = await service
    .from('record_disputes')
    .update({
      status: 'resolved',
      admin_notes: adminNotes ?? null,
      admin_decision: decision,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', disputeId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (decision === 'record_removed' && recordId) {
    const { error: delErr } = await service.from('public_records').delete().eq('id', recordId)
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })
    logAdminAction({
      adminId: admin.id,
      actionType: 'dispute.record_removed',
      resourceType: 'public_record',
      resourceId: recordId,
      subjectUserId: dispute?.disputed_by,
      detail: { disputeId, decision, adminNotes },
    })
  }

  logAdminAction({
    adminId: admin.id,
    actionType: 'dispute.resolved',
    resourceType: 'record_dispute',
    resourceId: disputeId,
    subjectUserId: dispute?.disputed_by,
    detail: { decision, recordId, adminNotes },
  })

  // Fire-and-forget notification to the submitter
  if (dispute?.disputed_by) {
    void (async () => {
      try {
        const { data: submitter } = await service
          .from('profiles')
          .select('full_name, email')
          .eq('id', dispute.disputed_by)
          .single()
        if (submitter?.email) {
          const rec = (dispute.record as unknown) as { title: string | null; description: string | null } | null
          const label = rec?.title || rec?.description?.slice(0, 60) || undefined
          await sendDisputeResolvedEmail(submitter.email, {
            firstName: submitter.full_name?.split(' ')[0],
            decision,
            recordLabel: label,
            adminNotes,
          })
        }
      } catch (err) {
        console.error('[resolve-dispute] notify failed:', err)
      }
    })()
  }

  return NextResponse.json({ ok: true })
}
