import { type NextRequest, NextResponse } from 'next/server'

// Allowed Origin headers for state-changing requests. Keep in sync with
// deployed domains. Webhooks that legitimately come cross-origin (Stripe,
// cron) should NOT call this helper — they verify their own signatures.
const ALLOWED_ORIGINS = new Set<string>([
  'https://vettrentals.com',
  'https://www.vettrentals.com',
  // Localhost + Vercel preview deploys
  'http://localhost:3000',
  'http://127.0.0.1:3000',
])

const ALLOWED_ORIGIN_SUFFIXES = [
  '.vercel.app', // Vercel preview deployments
]

function isAllowed(origin: string): boolean {
  if (ALLOWED_ORIGINS.has(origin)) return true
  for (const suffix of ALLOWED_ORIGIN_SUFFIXES) {
    try {
      const url = new URL(origin)
      if (url.hostname.endsWith(suffix)) return true
    } catch {
      // ignore malformed origins
    }
  }
  return false
}

function safeReferrerOrigin(referer: string): string | null {
  try {
    return new URL(referer).origin
  } catch {
    return null
  }
}

/**
 * Same-origin gate for state-changing requests. Returns a 403 NextResponse if
 * the request's Origin header isn't in our allowlist, otherwise returns null
 * so the caller can proceed.
 *
 * Falls back to Referer when Origin is absent (e.g. some browsers + proxies).
 * A request with neither Origin nor Referer is rejected — no legitimate
 * browser-initiated state-change hits us without one of those headers, and
 * curl / bot traffic is precisely who we want to block from writing.
 */
export function assertSameOrigin(req: NextRequest): NextResponse | null {
  const origin = req.headers.get('origin')
  const referer = req.headers.get('referer')
  // Wrap the URL parse — a malformed Referer header used to crash this helper
  // with a TypeError, which Next.js surfaced as a 500 to the caller (and a
  // noisy Sentry event). Now the malformed value is treated as 'no candidate'
  // and returns a clean 403.
  const candidate = origin ?? (referer ? safeReferrerOrigin(referer) : null)

  if (!candidate) {
    return NextResponse.json({ error: 'Missing Origin header' }, { status: 403 })
  }
  if (!isAllowed(candidate)) {
    return NextResponse.json({ error: 'Cross-origin request blocked' }, { status: 403 })
  }
  return null
}
