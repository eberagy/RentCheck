import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { sanitizeText } from '@/lib/sanitize'
import { sendCityAlertConfirmationEmail } from '@/lib/email'
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

  const cleanEmail = email.toLowerCase().trim()
  const cleanCity = city ? sanitizeText(city).slice(0, 100) : null
  const cleanState = stateAbbr ? stateAbbr.toUpperCase() : null

  const { error } = await service
    .from('email_leads')
    .insert({
      email: cleanEmail,
      source: sanitizeText(source).slice(0, 64),
      city: cleanCity,
      state_abbr: cleanState,
    })

  const isDuplicate = error && (error.message.includes('duplicate') || error.message.includes('unique'))
  if (error && !isDuplicate) {
    console.error('[email-leads] insert failed:', error)
    return NextResponse.json({ error: 'Could not save' }, { status: 500 })
  }

  // Confirmation email — only send when (a) the lead is new, (b) we have a
  // city + state to confirm, and (c) RESEND_API_KEY is set. Fire-and-forget
  // so the API responds fast even if Resend is slow.
  if (!isDuplicate && cleanCity && cleanState && process.env.RESEND_API_KEY) {
    void sendCityAlertConfirmationEmail(cleanEmail, { city: cleanCity, stateAbbr: cleanState })
      .catch(err => console.error('[email-leads] confirmation send failed:', err))
  }

  // If a signed-in user submitted a city + state, also create a saved_search
  // row so they show up on their dashboard and the weekly digest cron picks
  // them up. Best-effort: failures don't block the email_leads response.
  if (cleanCity && cleanState) {
    try {
      const userClient = await createClient()
      const { data: { user } } = await userClient.auth.getUser()
      if (user) {
        await service
          .from('saved_searches')
          .upsert(
            { user_id: user.id, city: cleanCity, state_abbr: cleanState, notify_email: true },
            { onConflict: 'user_id,city,state_abbr' },
          )
      }
    } catch (err) {
      console.error('[email-leads] saved_search upsert failed:', err)
    }
  }

  return NextResponse.json({ ok: true })
}
