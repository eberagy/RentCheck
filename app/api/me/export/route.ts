import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

// GET /api/me/export
// Returns a JSON download of every row the signed-in user owns across Vett.
// CCPA §1798.100 / GDPR Art. 15 — data subject access request self-serve.
export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  // 3 per hour — export is cheap but shouldn't be used as a scraping vector
  const rl = rateLimit(`export:${user.id}`, 3, 3600_000)
  if (!rl.success) return rateLimitResponse()

  const service = createServiceClient()

  const [
    { data: profile },
    { data: reviews },
    { data: watchlist },
    { data: claims },
    { data: submissions },
    { data: disputes },
    { data: flags },
    { data: responses },
    { data: savedSearches },
    { data: responseTemplates },
    { data: emailLeads },
  ] = await Promise.all([
    service.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    service.from('reviews').select('*').eq('reviewer_id', user.id),
    service.from('watchlist').select('*').eq('user_id', user.id),
    service.from('landlord_claims').select('*').eq('claimed_by', user.id),
    service.from('landlord_submissions').select('*').eq('submitted_by', user.id),
    service.from('record_disputes').select('*').eq('disputed_by', user.id),
    service.from('review_flags').select('*').eq('flagged_by', user.id),
    (async () => {
      try { return await service.from('review_helpful_votes').select('*').eq('user_id', user.id) }
      catch { return { data: null } }
    })(),
    service.from('saved_searches').select('*').eq('user_id', user.id),
    service.from('response_templates').select('*').eq('created_by', user.id),
    // email_leads doesn't have user_id (anon capture path), but if the
    // user submitted while signed in their email matches profile.email.
    user.email
      ? service.from('email_leads').select('*').eq('email', user.email.toLowerCase())
      : Promise.resolve({ data: [] }),
  ])

  const payload = {
    meta: {
      site: 'vettrentals.com',
      exported_at: new Date().toISOString(),
      user_id: user.id,
      note: 'This export contains every row in Vett\'s database owned by your account. Public reviews remain on the site even after account deletion but are disassociated from your identity.',
    },
    profile: profile ?? null,
    reviews: reviews ?? [],
    watchlist: watchlist ?? [],
    landlord_claims: claims ?? [],
    landlord_submissions: submissions ?? [],
    record_disputes: disputes ?? [],
    review_flags: flags ?? [],
    review_helpful_votes: responses ?? [],
    saved_searches: savedSearches ?? [],
    response_templates: responseTemplates ?? [],
    email_leads: emailLeads ?? [],
  }

  const body = JSON.stringify(payload, null, 2)
  const filename = `vett-data-export-${user.id.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.json`
  return new NextResponse(body, {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="${filename}"`,
      'cache-control': 'no-store',
    },
  })
}
