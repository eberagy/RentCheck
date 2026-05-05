import { describe, it, expect, vi, afterEach } from 'vitest'
import { track, identifyUser } from './posthog'

// posthog tests run in node — the function checks `typeof window === 'undefined'`
// and short-circuits on the server-side, so we exercise the SSR-safe path here.

describe('posthog tracking (server-side path)', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('track noops on the server (no window) regardless of key', () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'test-key')
    expect(() => track('landlord_viewed')).not.toThrow()
    expect(() => track('search_performed', { q: 'pittsburgh' })).not.toThrow()
  })

  it('identifyUser noops on the server', () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'test-key')
    expect(() => identifyUser('user-1', { email: 'a@b.com' })).not.toThrow()
    expect(() => identifyUser('user-1')).not.toThrow()
  })

  it('track noops even with no NEXT_PUBLIC_POSTHOG_KEY', () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', '')
    expect(() => track('review_submitted', { rating: 5 })).not.toThrow()
  })

  it('handles every defined VettEvent without throwing', () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', '')
    const events = [
      'landlord_viewed', 'property_viewed', 'search_performed',
      'review_started', 'review_submitted', 'lease_uploaded',
      'watchlist_added', 'watchlist_removed',
      'claim_started', 'claim_submitted',
      'dispute_submitted', 'record_viewed', 'rights_page_viewed',
    ] as const
    for (const e of events) {
      expect(() => track(e)).not.toThrow()
    }
  })
})
