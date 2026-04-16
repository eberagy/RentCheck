// PostHog analytics event tracking
// Client-side only — use in 'use client' components

export type RentCheckEvent =
  | 'landlord_viewed'
  | 'property_viewed'
  | 'search_performed'
  | 'review_started'
  | 'review_submitted'
  | 'lease_uploaded'
  | 'watchlist_added'
  | 'watchlist_removed'
  | 'claim_started'
  | 'claim_submitted'
  | 'dispute_submitted'
  | 'record_viewed'
  | 'rights_page_viewed'

export function track(event: RentCheckEvent, properties?: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return

  import('posthog-js').then(({ default: posthog }) => {
    posthog.capture(event, properties)
  }).catch(() => {})
}

export function identifyUser(id: string, properties?: { email?: string; name?: string }) {
  if (typeof window === 'undefined') return
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return

  import('posthog-js').then(({ default: posthog }) => {
    posthog.identify(id, properties)
  }).catch(() => {})
}
