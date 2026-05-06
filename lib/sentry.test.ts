import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { captureException, setUser } from './sentry'

describe('captureException', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('logs to console.error in development (does not call Sentry SDK)', () => {
    vi.stubEnv('NODE_ENV', 'development')
    const err = new Error('boom')
    captureException(err, { module: 'test' })
    expect(console.error).toHaveBeenCalledWith('[Sentry]', err, { module: 'test' })
  })

  it('does not throw in production when @sentry/nextjs is unavailable', () => {
    vi.stubEnv('NODE_ENV', 'production')
    // Should never throw — the dynamic import is wrapped in .catch(() => {})
    expect(() => captureException(new Error('prod-error'))).not.toThrow()
  })

  it('accepts arbitrary error shapes (string, object, undefined) without throwing', () => {
    vi.stubEnv('NODE_ENV', 'development')
    expect(() => captureException('string error')).not.toThrow()
    expect(() => captureException({ custom: 'shape' })).not.toThrow()
    expect(() => captureException(undefined)).not.toThrow()
  })
})

describe('setUser', () => {
  // The signature is (id: string) — single arg, no email. This pins the
  // no-PII contract added in eae47d9 so a future change can't quietly
  // re-add the email param and start leaking renter PII to Sentry's
  // 90-day retention window.

  it('accepts only an id and does not throw', () => {
    expect(() => setUser('user-uuid-123')).not.toThrow()
  })

  it('signature is single-arg (compile-time guard via TS, runtime no-op extra args)', () => {
    // If someone naively calls setUser(id, email), TS will reject. At
    // runtime an extra positional arg silently disappears. This test
    // exists so the regression shows up in a diff: change setUser to
    // accept email and this assertion loses its purpose.
    expect(setUser.length).toBe(1)
  })
})
