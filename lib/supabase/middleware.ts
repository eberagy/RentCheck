import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Routes that legitimately accept cross-origin POSTs:
// - Stripe webhook verifies its own signature
// - Cron + sync endpoints verify CRON_SECRET header
// Everything else under /api/ that's a state-changing request needs an
// Origin / Referer from an allowlisted domain.
const CROSS_ORIGIN_ALLOWED_PREFIXES = [
  '/api/stripe/webhook',
  '/api/cron/',
  '/api/sync/',
]

const ALLOWED_ORIGINS = new Set<string>([
  'https://vettrentals.com',
  'https://www.vettrentals.com',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
])

function originIsAllowed(origin: string | null): boolean {
  if (!origin) return false
  if (ALLOWED_ORIGINS.has(origin)) return true
  try {
    const url = new URL(origin)
    if (url.hostname.endsWith('.vercel.app')) return true
  } catch {
    return false
  }
  return false
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  // Origin check for state-changing API requests. Runs BEFORE auth so a
  // forged cross-origin cookie attack gets dropped at the edge.
  const method = request.method
  const pathname = request.nextUrl.pathname
  const isWrite = method === 'POST' || method === 'PATCH' || method === 'DELETE' || method === 'PUT'
  const isApi = pathname.startsWith('/api/')
  const needsOriginCheck =
    isApi && isWrite && !CROSS_ORIGIN_ALLOWED_PREFIXES.some(p => pathname.startsWith(p))

  if (needsOriginCheck) {
    const origin = request.headers.get('origin')
    const referer = request.headers.get('referer')
    const candidate = origin ?? (referer ? safeOrigin(referer) : null)
    if (!originIsAllowed(candidate)) {
      return NextResponse.json(
        { error: 'Cross-origin request blocked' },
        { status: 403 },
      )
    }
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session if expired
  const { data: { user } } = await supabase.auth.getUser()

  // Protect routes
  const url = request.nextUrl.clone()

  // Admin routes: require admin user_type
  if (pathname.startsWith('/admin')) {
    if (!user) {
      url.pathname = '/login'
      url.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(url)
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .single()
    if (profile?.user_type !== 'admin') {
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  // Auth-gated user flows: dashboard, landlord portal, review submission, add-landlord, dispute
  const requiresAuthAndNotBanned =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/landlord-portal') ||
    pathname.startsWith('/review/new') ||
    pathname.startsWith('/add-landlord') ||
    pathname.startsWith('/dispute')
  if (requiresAuthAndNotBanned) {
    if (!user) {
      url.pathname = '/login'
      url.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(url)
    }
    const { data: prof } = await supabase
      .from('profiles')
      .select('is_banned')
      .eq('id', user.id)
      .single()
    if (prof?.is_banned) {
      url.pathname = '/'
      url.searchParams.set('error', 'account_suspended')
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

function safeOrigin(referer: string): string | null {
  try { return new URL(referer).origin } catch { return null }
}
