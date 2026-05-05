import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

// Run middleware on auth-gated paths + API. Public content pages
// (/, /landlord/*, /property/*, /city/*, /search, /blog, /about,
// /faq, etc.) intentionally do NOT match — even an empty middleware
// pass disqualifies a page from full ISR on Vercel. URL-format guards
// for /landlord, /property, /city are still enforced via the regex
// envelopes in lib/url-guards.ts at the route level.
export const config = {
  matcher: [
    '/admin/:path*',
    '/dashboard/:path*',
    '/landlord-portal/:path*',
    '/review/new/:path*',
    '/add-landlord/:path*',
    '/dispute/:path*',
    '/api/:path*',
  ],
}
