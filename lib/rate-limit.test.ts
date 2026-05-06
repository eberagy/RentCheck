import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { rateLimit } from './rate-limit'

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
