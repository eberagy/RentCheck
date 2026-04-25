import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sanitizeText } from '@/lib/sanitize'
import { sendSubmissionReceivedEmail } from '@/lib/email'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { z } from 'zod'

const MAX_RESPONSE_LENGTH = 1000

const schema = z.object({
  reviewId: z.string().uuid(),
  response: z.string().min(1).max(MAX_RESPONSE_LENGTH),
})

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const rl = rateLimit(`landlord-response:${user.id}`, 10, 3600_000)
  if (!rl.success) return rateLimitResponse()

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid' }, { status: 422 })

  const { reviewId, response } = parsed.data
  const cleaned = sanitizeText(response).trim()
  if (!cleaned) return NextResponse.json({ error: 'Response is empty' }, { status: 422 })

  const service = createServiceClient()

  const { data: review } = await service
    .from('reviews')
    .select('id, landlord_id')
    .eq('id', reviewId)
    .single()
  if (!review) return NextResponse.json({ error: 'Review not found' }, { status: 404 })

  const { data: landlord } = await service
    .from('landlords')
    .select('id, claimed_by, is_claimed, is_verified')
    .eq('id', review.landlord_id)
    .single()
  if (!landlord) return NextResponse.json({ error: 'Landlord not found' }, { status: 404 })

  if (landlord.claimed_by !== user.id || !landlord.is_verified) {
    return NextResponse.json({ error: 'You must be the verified claimant of this landlord to respond.' }, { status: 403 })
  }

  const { error } = await service
    .from('reviews')
    .update({
      landlord_response: cleaned,
      landlord_response_status: 'pending',
    })
    .eq('id', reviewId)

  if (error) { console.error("[db]", error); return NextResponse.json({ error: "Database error" }, { status: 500 }) }

  void (async () => {
    try {
      const { data: claimer } = await service.from('profiles').select('full_name, email').eq('id', user.id).single()
      const { data: landlordInfo } = await service.from('landlords').select('display_name').eq('id', review.landlord_id).single()
      if (claimer?.email) {
        await sendSubmissionReceivedEmail(claimer.email, {
          firstName: claimer.full_name?.split(' ')[0],
          kind: 'response',
          target: landlordInfo?.display_name,
        })
      }
    } catch (err) {
      console.error('[landlord-response] ack email failed:', err)
    }
  })()

  return NextResponse.json({ ok: true })
}
