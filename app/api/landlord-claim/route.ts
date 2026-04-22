import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

const schema = z.object({
  landlordId: z.string().uuid(),
  docUrl: z.string().min(1),
  docFilename: z.string().optional(),
  verificationType: z.enum(['utility_bill', 'government_id', 'deed', 'business_reg', 'other']),
})

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  // Rate limit: 3 claims per hour per user
  const rl = rateLimit(`claims:${user.id}`, 3, 3600_000)
  if (!rl.success) return rateLimitResponse()

  const { landlordId, docUrl, docFilename, verificationType } = parsed.data

  // Verify the document path belongs to this user
  if (!docUrl.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  // Check the landlord exists and is unclaimed
  const { data: landlord } = await supabase
    .from('landlords')
    .select('id, is_claimed, display_name')
    .eq('id', landlordId)
    .single()

  if (!landlord) return NextResponse.json({ error: 'Landlord not found' }, { status: 404 })
  if (landlord.is_claimed) return NextResponse.json({ error: 'This profile has already been claimed' }, { status: 409 })

  // Check for existing pending claim from this user
  const { data: existingClaim } = await supabase
    .from('landlord_claims')
    .select('id, status')
    .eq('landlord_id', landlordId)
    .eq('claimed_by', user.id)
    .eq('status', 'pending')
    .limit(1)
    .single()

  if (existingClaim) {
    return NextResponse.json({ error: 'You already have a pending claim for this landlord' }, { status: 409 })
  }

  const { error } = await supabase.from('landlord_claims').insert({
    landlord_id: landlordId,
    claimed_by: user.id,
    doc_url: docUrl,
    doc_filename: docFilename ?? null,
    verification_type: verificationType,
    status: 'pending',
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, message: 'Claim submitted. We will review within 48 hours.' }, { status: 201 })
}
