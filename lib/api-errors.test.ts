import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { dbError } from './api-errors'

// captureException is dynamically imported inside lib/sentry.ts, so we don't
// need to mock @sentry/nextjs here — the module's internal try/catch swallows
// any failure when the Sentry SDK isn't loaded. We just exercise the helper's
// public surface (status code, body, console hit, where-tag passthrough).

describe('dbError', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleSpy.mockRestore()
  })

  it('returns a 500 NextResponse with the canonical Database error shape', async () => {
    const res = dbError('reviews:insert', new Error('table is locked'))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body).toEqual({ error: 'Database error' })
  })

  it('logs the error to console with the [db] prefix', () => {
    const err = new Error('connection refused')
    dbError('flag:insert', err)
    expect(consoleSpy).toHaveBeenCalledWith('[db]', err)
  })

  it('does not leak the where-tag or original error message into the response body', async () => {
    // The whole point — the public response is generic. A leaked SQL error
    // ("permission denied for table profiles") would tell an attacker more
    // about the schema than they should know.
    const res = dbError('me/delete:profile', new Error('PG: relation "profiles" does not exist'))
    const body = await res.json()
    expect(JSON.stringify(body)).not.toContain('me/delete')
    expect(JSON.stringify(body)).not.toContain('profiles')
    expect(JSON.stringify(body)).not.toContain('PG:')
  })

  it('handles non-Error objects without throwing', () => {
    expect(() => dbError('test', { weird: 'shape' })).not.toThrow()
    expect(() => dbError('test', null)).not.toThrow()
    expect(() => dbError('test', undefined)).not.toThrow()
    expect(() => dbError('test', 'just a string')).not.toThrow()
  })
})
