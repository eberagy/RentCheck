import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
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
  }

  return NextResponse.json({ ok: true })
}
