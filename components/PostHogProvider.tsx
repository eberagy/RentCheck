'use client'

import { Suspense, useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { identifyUser } from '@/lib/posthog'
import { setUser as setSentryUser, clearUser as clearSentryUser } from '@/lib/sentry'

function PostHogPageview() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://app.posthog.com'
    if (!key) return

    import('posthog-js').then(({ default: posthog }) => {
      if (!posthog.__loaded) {
        posthog.init(key, {
          api_host: host,
          capture_pageview: false,
          capture_pageleave: true,
          autocapture: false,
          persistence: 'localStorage',
        })
      }
      posthog.capture('$pageview', { $current_url: window.location.href })
    }).catch(() => {})
  }, [pathname, searchParams])

  return null
}

// Identify the user to PostHog + Sentry once auth resolves. Two purposes:
//
//  - PostHog: stitches anonymous pre-signin events (search_performed,
//    landlord_viewed) to the same person record after they sign in.
//  - Sentry: tags any client-side error capture with the user id so
//    the Issues view can show "X users impacted" instead of "anonymous".
//    Email is intentionally NOT passed to Sentry — see lib/sentry.ts
//    for the no-PII rationale (90-day retention window).
//
// Both helpers are no-ops when their respective SDKs aren't loaded
// (NEXT_PUBLIC_POSTHOG_KEY / NEXT_PUBLIC_SENTRY_DSN gates).
function PostHogIdentify() {
  const { user, profile } = useAuth()
  useEffect(() => {
    if (!user) {
      // Sign-out path: clear PostHog + Sentry user context so the next
      // error or event on this browser isn't misattributed to whoever
      // was previously signed in. Without this, "user A reports a bug"
      // could actually be "user B who signed out and never refreshed."
      clearSentryUser()
      import('posthog-js').then(({ default: posthog }) => {
        if (posthog.__loaded) posthog.reset()
      }).catch(() => {})
      return
    }
    identifyUser(user.id, {
      email: user.email ?? undefined,
      name: profile?.full_name ?? undefined,
    })
    setSentryUser(user.id)
  }, [user, profile])
  return null
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <PostHogPageview />
      </Suspense>
      <PostHogIdentify />
      {children}
    </>
  )
}
