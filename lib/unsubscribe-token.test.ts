import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createUnsubscribeToken, verifyUnsubscribeToken } from './unsubscribe-token'

const ORIGINAL = process.env.CRON_SECRET

beforeEach(() => {
  process.env.CRON_SECRET = 'test-secret-do-not-ship'
})

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.CRON_SECRET
  else process.env.CRON_SECRET = ORIGINAL
})

describe('unsubscribe-token', () => {
  it('round-trips a valid userId', () => {
    const token = createUnsubscribeToken('user-abc-123')
    const result = verifyUnsubscribeToken(token)
    expect(result).toEqual({ userId: 'user-abc-123' })
  })

  it('rejects a malformed token', () => {
    expect(verifyUnsubscribeToken('not-a-token')).toBeNull()
    expect(verifyUnsubscribeToken('')).toBeNull()
    expect(verifyUnsubscribeToken('a.b.c')).toBeNull()
  })

  it('rejects a token with a tampered payload', () => {
    const token = createUnsubscribeToken('user-abc-123')
    // Replace the payload (first segment) with a different userId
    const [, sig] = token.split('.')
    const tampered = Buffer.from('user-different-456.0').toString('base64')
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    expect(verifyUnsubscribeToken(`${tampered}.${sig}`)).toBeNull()
  })

  it('rejects a token signed with a different key', () => {
    const token = createUnsubscribeToken('user-1')
    process.env.CRON_SECRET = 'a-different-secret'
    expect(verifyUnsubscribeToken(token)).toBeNull()
  })

  it('rejects a token whose signature length is wrong', () => {
    const token = createUnsubscribeToken('u') + 'extra'
    expect(verifyUnsubscribeToken(token)).toBeNull()
  })

  it('throws when no signing key is configured (fails closed)', () => {
    delete process.env.CRON_SECRET
    delete process.env.UNSUBSCRIBE_SIGNING_KEY
    expect(() => createUnsubscribeToken('user-1')).toThrow(
      /CRON_SECRET or UNSUBSCRIBE_SIGNING_KEY/
    )
  })

  it('falls back to UNSUBSCRIBE_SIGNING_KEY when CRON_SECRET missing', () => {
    delete process.env.CRON_SECRET
    process.env.UNSUBSCRIBE_SIGNING_KEY = 'fallback-key'
    const token = createUnsubscribeToken('user-1')
    const result = verifyUnsubscribeToken(token)
    expect(result?.userId).toBe('user-1')
    delete process.env.UNSUBSCRIBE_SIGNING_KEY
  })
})
