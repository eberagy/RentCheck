import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { sanitizeText } from '@/lib/sanitize'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

const schema = z.object({
  recordId: z.string().uuid(),
  reason: z.string().min(10).max(500),
  detail: z.string().max(2000).optional(),
  evidenceUrl: z.string().url().optional(),
})

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('is_banned').eq('id', user.id).single()
  if (profile?.is_banned) return NextResponse.json({ error: 'Account suspended' }, { status: 403 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  // Rate limit: 5 disputes per hour per user
  const rl = rateLimit(`disputes:${user.id}`, 5, 3600_000)
  if (!rl.success) return rateLimitResponse()

  const { recordId, reason: rawReason, detail: rawDetail, evidenceUrl } = parsed.data
  const reason = sanitizeText(rawReason)
  const detail = rawDetail ? sanitizeText(rawDetail) : undefined

  // Verify record exists
  const { data: record } = await supabase
    .from('public_records')
    .select('id')
    .eq('id', recordId)
    .single()

  if (!record) return NextResponse.json({ error: 'Record not found' }, { status: 404 })

  // Check for existing open dispute from this user for same record
  const { data: existing } = await supabase
    .from('record_disputes')
    .select('id')
    .eq('record_id', recordId)
    .eq('disputed_by', user.id)
    .in('status', ['open', 'pending', 'reviewed'])
    .single()

  if (existing) return NextResponse.json({ error: 'You already have an open dispute for this record' }, { status: 409 })

  const { error } = await supabase.from('record_disputes').insert({
    record_id: recordId,
    disputed_by: user.id,
    reason,
    detail: detail ?? null,
    evidence_url: evidenceUrl ?? null,
    status: 'open',
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, message: 'Dispute submitted. We will review within 5-7 business days.' }, { status: 201 })
}
