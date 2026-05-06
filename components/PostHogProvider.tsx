'use client'

import { Suspense, useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { identifyUser } from '@/lib/posthog'

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

// Identify the user to PostHog once auth resolves. Stitches anonymous
// pre-signin events (search_performed, landlord_viewed) to the same
// person record after they sign in. No-op when PostHog isn't loaded.
function PostHogIdentify() {
  const { user, profile } = useAuth()
  useEffect(() => {
    if (!user) return
    identifyUser(user.id, {
      email: user.email ?? undefined,
      name: profile?.full_name ?? undefined,
    })
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
