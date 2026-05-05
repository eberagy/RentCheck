import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { isValidLandlordPath, isValidPropertyPath, isValidCityPath } from '@/lib/url-guards'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Hard 404 at the edge for typo'd public-content URLs. Returning a
  // status-404 response here keeps soft-404s out of search-engine indexes
  // (Next.js's notFound() inside a page renders the not-found body with
  // a 200 status). For valid URLs, fall straight through to NextResponse.next()
  // — which doesn't modify the response, so the route's ISR caching stays
  // intact (verified live: x-vercel-cache: HIT after this change).
  if (pathname.startsWith('/property/') && !isValidPropertyPath(pathname)) {
    return new NextResponse('Not Found', { status: 404 })
  }
  if (pathname.startsWith('/landlord/') && !isValidLandlordPath(pathname)) {
    return new NextResponse('Not Found', { status: 404 })
  }
  if (pathname.startsWith('/city/') && pathname !== '/city/' && !isValidCityPath(pathname)) {
    return new NextResponse('Not Found', { status: 404 })
  }

  // Auth-gated paths (admin/dashboard/etc.) get the full session refresh +
  // origin checks via updateSession. Everything else (valid landlord/
  // property/city pages, plus the marketing surface) just passes through.
  return updateSession(request)
}

// Matcher includes /landlord, /property, /city ONLY so the typo-guard 404s
// run at the edge. updateSession() returns NextResponse.next() with no
// session refresh on those paths, so ISR caching is preserved.
export const config = {
  matcher: [
    '/admin/:path*',
    '/dashboard/:path*',
    '/landlord-portal/:path*',
    '/review/new/:path*',
    '/add-landlord/:path*',
    '/dispute/:path*',
    '/api/:path*',
    '/landlord/:path*',
    '/property/:path*',
    '/city/:path*',
  ],
}
