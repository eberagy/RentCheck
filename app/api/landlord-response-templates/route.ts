import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sanitizeText } from '@/lib/sanitize'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { z } from 'zod'

const MAX_LABEL = 80
const MAX_BODY = 1000

const createSchema = z.object({
  landlordId: z.string().uuid(),
  label: z.string().min(1).max(MAX_LABEL),
  body: z.string().min(1).max(MAX_BODY),
})

async function requireVerifiedClaimant(userId: string, landlordId: string) {
  const service = createServiceClient()
  const { data: landlord } = await service
    .from('landlords')
    .select('id, claimed_by, is_verified')
    .eq('id', landlordId)
    .single()
  if (!landlord) return { error: 'Landlord not found', status: 404 as const }
  if (landlord.claimed_by !== userId || !landlord.is_verified) {
    return { error: 'Only the verified claimant can manage templates.', status: 403 as const }
  }
  return { ok: true, service }
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const url = new URL(req.url)
  const landlordId = url.searchParams.get('landlordId') ?? ''
  if (!landlordId) return NextResponse.json({ error: 'Missing landlordId' }, { status: 422 })
  const uuid = z.string().uuid().safeParse(landlordId)
  if (!uuid.success) return NextResponse.json({ error: 'Invalid landlordId' }, { status: 422 })

  const gate = await requireVerifiedClaimant(user.id, landlordId)
  if ('error' in gate) return NextResponse.json({ error: gate.error }, { status: gate.status })

  const { data, error } = await gate.service
    .from('response_templates')
    .select('id, label, body, created_at, updated_at')
    .eq('landlord_id', landlordId)
    .order('updated_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ templates: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const rl = rateLimit(`response-templates:${user.id}`, 30, 3600_000)
  if (!rl.success) return rateLimitResponse()

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 422 })

  const { landlordId, label, body: rawBody } = parsed.data
  const cleanLabel = sanitizeText(label).trim().slice(0, MAX_LABEL)
  const cleanBody = sanitizeText(rawBody).trim().slice(0, MAX_BODY)
  if (!cleanLabel || !cleanBody) return NextResponse.json({ error: 'Label and body required' }, { status: 422 })

  const gate = await requireVerifiedClaimant(user.id, landlordId)
  if ('error' in gate) return NextResponse.json({ error: gate.error }, { status: gate.status })

  const { count } = await gate.service
    .from('response_templates')
    .select('id', { count: 'exact', head: true })
    .eq('landlord_id', landlordId)
  if ((count ?? 0) >= 25) {
    return NextResponse.json({ error: 'Template limit reached (25 per landlord).' }, { status: 422 })
  }

  const { data, error } = await gate.service
    .from('response_templates')
    .insert({
      landlord_id: landlordId,
      created_by: user.id,
      label: cleanLabel,
      body: cleanBody,
    })
    .select('id, label, body, created_at, updated_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ template: data })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const url = new URL(req.url)
  const id = url.searchParams.get('id') ?? ''
  const uuid = z.string().uuid().safeParse(id)
  if (!uuid.success) return NextResponse.json({ error: 'Invalid id' }, { status: 422 })

  const service = createServiceClient()
  const { data: tpl } = await service
    .from('response_templates')
    .select('id, landlord_id')
    .eq('id', id)
    .single()
  if (!tpl) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const gate = await requireVerifiedClaimant(user.id, tpl.landlord_id)
  if ('error' in gate) return NextResponse.json({ error: gate.error }, { status: gate.status })

  const { error } = await service.from('response_templates').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
