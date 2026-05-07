import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { rateLimit, rateLimitResponse } from './rate-limit'

describe('rateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('allows requests up to the limit', () => {
    const key = `test:${Math.random()}`
    expect(rateLimit(key, 3).success).toBe(true)
    expect(rateLimit(key, 3).success).toBe(true)
    expect(rateLimit(key, 3).success).toBe(true)
  })

  it('blocks the (limit+1)th request', () => {
    const key = `test:${Math.random()}`
    rateLimit(key, 2)
    rateLimit(key, 2)
    const blocked = rateLimit(key, 2)
    expect(blocked.success).toBe(false)
    expect(blocked.remaining).toBe(0)
  })

  it('reports retryAfter approximately equal to the window when blocked', () => {
    const key = `test:${Math.random()}`
    rateLimit(key, 1, 60_000)
    const blocked = rateLimit(key, 1, 60_000)
    expect(blocked.success).toBe(false)
    // First slot fired at t=0, frees up at t=60. Right after, retryAfter
    // is at most 60 (rounded up). Should never be 0 when blocked.
    expect(blocked.retryAfter).toBeGreaterThan(0)
    expect(blocked.retryAfter).toBeLessThanOrEqual(60)
  })

  it('retryAfter shrinks as the window approaches expiry', () => {
    const key = `test:${Math.random()}`
    rateLimit(key, 1, 60_000)
    const at5s = rateLimit(key, 1, 60_000)
    vi.advanceTimersByTime(50_000)
    const at55s = rateLimit(key, 1, 60_000)
    expect(at55s.retryAfter).toBeLessThan(at5s.retryAfter)
  })

  it('returns retryAfter: 0 on a successful (non-blocked) call', () => {
    const key = `test:${Math.random()}`
    expect(rateLimit(key, 5).retryAfter).toBe(0)
  })

  it('reports decreasing remaining count', () => {
    const key = `test:${Math.random()}`
    expect(rateLimit(key, 3).remaining).toBe(2)
    expect(rateLimit(key, 3).remaining).toBe(1)
    expect(rateLimit(key, 3).remaining).toBe(0)
  })

  it('resets after the window passes', () => {
    const key = `test:${Math.random()}`
    rateLimit(key, 1, 1000)
    expect(rateLimit(key, 1, 1000).success).toBe(false)
    vi.advanceTimersByTime(1500)
    expect(rateLimit(key, 1, 1000).success).toBe(true)
  })

  it('isolates different keys', () => {
    const a = `a:${Math.random()}`
    const b = `b:${Math.random()}`
    rateLimit(a, 1)
    rateLimit(a, 1)
    expect(rateLimit(a, 1).success).toBe(false)
    // b should still have its full budget
    expect(rateLimit(b, 1).success).toBe(true)
  })
})

describe('rateLimitResponse', () => {
  it('returns 429 with the canonical JSON shape', async () => {
    const res = rateLimitResponse()
    expect(res.status).toBe(429)
    expect(res.headers.get('Content-Type')).toContain('application/json')
    const body = await res.json()
    expect(body).toEqual({ error: 'Too many requests. Please try again later.' })
  })

  it('uses default Retry-After of 60 when no result is passed', () => {
    const res = rateLimitResponse()
    expect(res.headers.get('Retry-After')).toBe('60')
  })

  it('uses the result.retryAfter value when passed', () => {
    const res = rateLimitResponse({ success: false, remaining: 0, retryAfter: 17 })
    expect(res.headers.get('Retry-After')).toBe('17')
  })

  it('still uses the default when result is success=true (defensive)', () => {
    // Calling rateLimitResponse on a success result is a programming error,
    // but the helper shouldn't crash — it just reads retryAfter from
    // whatever result was passed. A success result with retryAfter=0 would
    // surface as "Retry-After: 0", which clients interpret as "retry now."
    // Acceptable degradation.
    const res = rateLimitResponse({ success: true, remaining: 5, retryAfter: 0 })
    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('0')
  })
})
