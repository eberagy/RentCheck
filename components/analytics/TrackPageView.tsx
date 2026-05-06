'use client'

import { useEffect } from 'react'
import { track, type VettEvent } from '@/lib/posthog'

interface TrackPageViewProps {
  event: VettEvent
  /** Properties merged into the event. id, slug, etc. */
  properties?: Record<string, unknown>
}

/**
 * Fires a PostHog event once on mount. Use to instrument server-rendered
 * pages (which can't call client-only `track()` directly). The PostHogProvider
 * already captures generic `$pageview` events; this is for the typed Vett
 * events with structured properties (landlord_viewed, property_viewed, etc.).
 *
 * Example:
 *   <TrackPageView event="landlord_viewed" properties={{ landlord_id: id, slug }} />
 */
export function TrackPageView({ event, properties }: TrackPageViewProps) {
  useEffect(() => {
    track(event, properties)
    // Stringify so deep-equal checks don't re-fire on referentially-new
    // but value-equal property objects.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, JSON.stringify(properties ?? null)])

  return null
}
