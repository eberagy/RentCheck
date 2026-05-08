import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendWelcomeEmail } from '@/lib/email'
import { captureException } from '@/lib/sentry'
import { safeRedirectPath } from '@/lib/safe-redirect'

export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl
  const code = searchParams.get('code')
  const next = safeRedirectPath(searchParams.get('next'))

  if (code) {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && user) {
      const fullName = user.user_metadata?.full_name ?? user.user_metadata?.name ?? null
      const avatarUrl = user.user_metadata?.avatar_url ?? null

      // Check if profile exists. PGRST116 = "no rows" (legitimate
      // first-login case). Any other error here means we don't know
      // if the user is new or returning — without splitting them, a
      // transient lookup error would land them in the new-user branch
      // every time, sending duplicate welcome emails to existing
      // users on every retry.
      const { data: existing, error: existingErr } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('id', user.id)
        .single()
      const lookupOk = !existingErr || existingErr.code === 'PGRST116'
      if (existingErr && existingErr.code !== 'PGRST116') {
        captureException(existingErr, { where: 'auth/callback:profile-lookup', userId: user.id })
      }

      if (lookupOk && !existing) {
        // New user — create profile. If this fails the user is authed in
        // Supabase but has no profile row, which breaks every page that
        // joins on profiles. Critical to surface — captureException so
        // we know about it before users do via "I logged in and the
        // site is broken" support.
        const { error: insertErr } = await supabase.from('profiles').insert({
          id: user.id,
          email: user.email ?? '',
          full_name: fullName,
          avatar_url: avatarUrl,
        })
        if (insertErr) {
          captureException(insertErr, { where: 'auth/callback:profile-insert' })
        }

        // Fire-and-forget welcome email — only send when the insert
        // actually succeeded. Otherwise a unique-violation (the row
        // already exists, but our lookup transient-failed and we
        // retried) would send a duplicate welcome to an existing user.
        if (!insertErr && user.email) {
          void sendWelcomeEmail(user.email, fullName?.split(' ')[0] ?? undefined)
            .catch(err => console.error('[auth/callback] welcome email failed:', err))
        }
      } else if (existing && !existing.full_name && fullName) {
        // Existing user without a name — update it. Lower stakes than the
        // insert (the account already works), but a silent failure here
        // means the user keeps showing up as "Anonymous" in the navbar
        // forever, which is confusing.
        const { error: updateErr } = await supabase.from('profiles')
          .update({ full_name: fullName, avatar_url: avatarUrl })
          .eq('id', user.id)
        if (updateErr) {
          captureException(updateErr, { where: 'auth/callback:profile-update' })
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    }

    if (error) {
      captureException(error, { where: 'auth/callback:exchange' })
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
