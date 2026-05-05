import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { captureException } from './sentry'

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
