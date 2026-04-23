import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

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
  const pathname = url.pathname

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
