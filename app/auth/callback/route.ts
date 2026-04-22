import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && user) {
      const fullName = user.user_metadata?.full_name ?? user.user_metadata?.name ?? null
      const avatarUrl = user.user_metadata?.avatar_url ?? null

      // Check if profile exists
      const { data: existing } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('id', user.id)
        .single()

      if (!existing) {
        // New user — create profile
        await supabase.from('profiles').insert({
          id: user.id,
          email: user.email ?? '',
          full_name: fullName,
          avatar_url: avatarUrl,
        })
      } else if (!existing.full_name && fullName) {
        // Existing user without a name — update it
        await supabase.from('profiles')
          .update({ full_name: fullName, avatar_url: avatarUrl })
          .eq('id', user.id)
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
