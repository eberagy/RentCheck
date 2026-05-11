import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyUnsubscribeToken } from '@/lib/unsubscribe-token'
import { captureException } from '@/lib/sentry'

// RFC 8058 one-click unsubscribe endpoint. Gmail/Yahoo + 2024 sender
// requirements expect a POST URL that, given a recipient-specific token
// and a body of `List-Unsubscribe=One-Click`, immediately opts the user
// out without a confirmation screen.
//
// Email senders attach two headers:
//   List-Unsubscribe: <https://www.vettrentals.com/api/unsubscribe?token=XXX>
//   List-Unsubscribe-Post: List-Unsubscribe=One-Click
//
// The mail client clicks the header link → POSTs with the form body →
// we flip preferences and return 200. Same token format as the footer
// link, so the existing /unsubscribe GET page still works for users
// who click the visible link inside the email body.
//
// PII note: token decodes to either a Vett user id (UUID) or an email
// address. We never log either via Sentry context — only 'kind' tags
// (`user` vs `email`) which are coarse enough to triage without leaking.
export async function POST(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  // Form-encoded body per RFC 8058. Most mail clients send exactly
  // `List-Unsubscribe=One-Click`. We accept any non-empty body since
  // the token in the URL is the real authentication.
  const payload = verifyUnsubscribeToken(token)
  if (!payload) {
    // Expired or tampered token. 410 Gone tells mail clients not to
    // retry; 200 would have them keep showing "Unsubscribe" indefinitely.
    return NextResponse.json({ error: 'Token expired' }, { status: 410 })
  }

  const service = createServiceClient()
  try {
    if (payload.kind === 'user') {
      const { error } = await service
        .from('profiles')
        .update({ email_reviews: false, email_watchlist: false })
        .eq('id', payload.userId)
      if (error) {
        captureException(error, { where: 'api/unsubscribe:user', kind: 'user', userId: payload.userId })
        return NextResponse.json({ error: 'Update failed' }, { status: 500 })
      }
    } else {
      const { error } = await service
        .from('email_leads')
        .delete()
        .eq('email', payload.email)
      if (error) {
        captureException(error, { where: 'api/unsubscribe:email', kind: 'email' })
        return NextResponse.json({ error: 'Update failed' }, { status: 500 })
      }
    }
  } catch (err) {
    captureException(err, { where: 'api/unsubscribe:throw' })
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }

  // RFC 8058 doesn't mandate a response shape — 200 with empty body is
  // fine. We return a tiny JSON so curl users can confirm the result.
  return NextResponse.json({ ok: true })
}

// GET on this URL just forwards to the human-readable unsubscribe page.
// Some mail clients prefetch List-Unsubscribe links with GET before
// showing the user the Unsubscribe button; this 302 avoids a 405.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  const dest = token
    ? `/unsubscribe?token=${encodeURIComponent(token)}`
    : '/unsubscribe'
  return NextResponse.redirect(new URL(dest, req.url), { status: 302 })
}
