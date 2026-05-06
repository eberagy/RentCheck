import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock lib/sentry BEFORE importing the helper under test, so dbError picks
// up the spy when it imports captureException. vi.hoisted is required
// because vi.mock factories are hoisted above all top-level code, so a
// plain const declared above wouldn't be initialized yet at factory time.
const { captureExceptionMock } = vi.hoisted(() => ({ captureExceptionMock: vi.fn() }))
vi.mock('./sentry', () => ({
  captureException: captureExceptionMock,
  setUser: vi.fn(),
}))

import { dbError } from './api-errors'

describe('dbError', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    captureExceptionMock.mockClear()
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

  it('forwards the error to Sentry with the where-tag (suffixed :db)', () => {
    const err = new Error('insert failed')
    dbError('reviews:insert', err)
    expect(captureExceptionMock).toHaveBeenCalledTimes(1)
    expect(captureExceptionMock).toHaveBeenCalledWith(err, { where: 'reviews:insert:db' })
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
