import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sanitizeText } from '@/lib/sanitize'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { z } from 'zod'

const schema = z.object({
  landlordId: z.string().uuid(),
  website: z.string().url().max(300).optional().or(z.literal('')),
  phone: z.string().max(30).optional().or(z.literal('')),
  description: z.string().max(1200).optional().or(z.literal('')),
})

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const rl = rateLimit(`landlord-profile:${user.id}`, 20, 3600_000)
  if (!rl.success) return rateLimitResponse()

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 422 })

  const { landlordId, website, phone, description } = parsed.data
  const service = createServiceClient()

  const { data: landlord } = await service
    .from('landlords')
    .select('id, claimed_by, is_verified')
    .eq('id', landlordId)
    .single()
  if (!landlord) return NextResponse.json({ error: 'Landlord not found' }, { status: 404 })

  if (landlord.claimed_by !== user.id || !landlord.is_verified) {
    return NextResponse.json({ error: 'Only the verified claimant can edit this profile.' }, { status: 403 })
  }

  const updates: Record<string, string | null> = {}
  if (website !== undefined) updates.website = website ? website : null
  if (phone !== undefined) updates.phone = phone ? sanitizeText(phone).slice(0, 30) : null
  if (description !== undefined) updates.description = description ? sanitizeText(description).slice(0, 1200) : null

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 422 })
  }

  const { error } = await service
    .from('landlords')
    .update(updates)
    .eq('id', landlordId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
