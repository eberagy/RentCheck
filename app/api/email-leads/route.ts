import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { sanitizeText } from '@/lib/sanitize'
import { z } from 'zod'

// POST /api/email-leads — anon-friendly email capture endpoint.
// Tight IP rate-limit + unique (email,source) in the DB keep this from
// becoming a spam vector.
const schema = z.object({
  email: z.string().email().max(254),
  source: z.string().max(64).default('homepage'),
  city: z.string().max(100).optional(),
  stateAbbr: z.string().length(2).optional(),
})

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? req.headers.get('x-real-ip')
    ?? 'anon'
  const rl = rateLimit(`email-leads:${ip}`, 10, 3600_000)
  if (!rl.success) return rateLimitResponse()

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 422 })
  }

  const { email, source, city, stateAbbr } = parsed.data
  const service = createServiceClient()

  const { error } = await service
    .from('email_leads')
    .insert({
      email: email.toLowerCase().trim(),
      source: sanitizeText(source).slice(0, 64),
      city: city ? sanitizeText(city).slice(0, 100) : null,
      state_abbr: stateAbbr ? stateAbbr.toUpperCase() : null,
    })

  // Duplicate (email,source) is fine — treat as idempotent success.
  if (error && !error.message.includes('duplicate') && !error.message.includes('unique')) {
    console.error('[email-leads] insert failed:', error)
    return NextResponse.json({ error: 'Could not save' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
