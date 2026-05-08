import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import crypto from 'crypto'
import {
  createUnsubscribeToken,
  createEmailUnsubscribeToken,
  verifyUnsubscribeToken,
} from './unsubscribe-token'

const ORIGINAL = process.env.CRON_SECRET

beforeEach(() => {
  process.env.CRON_SECRET = 'test-secret-do-not-ship'
})

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.CRON_SECRET
  else process.env.CRON_SECRET = ORIGINAL
})

describe('unsubscribe-token (user-id variant)', () => {
  it('round-trips a valid userId', () => {
    const token = createUnsubscribeToken('user-abc-123')
    const result = verifyUnsubscribeToken(token)
    expect(result).toEqual({ kind: 'user', userId: 'user-abc-123' })
  })

  it('rejects a malformed token', () => {
    expect(verifyUnsubscribeToken('not-a-token')).toBeNull()
    expect(verifyUnsubscribeToken('')).toBeNull()
    expect(verifyUnsubscribeToken('a.b.c')).toBeNull()
  })

  it('rejects a token with a tampered payload', () => {
    const token = createUnsubscribeToken('user-abc-123')
    const [, sig] = token.split('.')
    const tampered = Buffer.from('u.user-different-456.0').toString('base64')
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
    expect(result).toEqual({ kind: 'user', userId: 'user-1' })
    delete process.env.UNSUBSCRIBE_SIGNING_KEY
  })

  it('still verifies legacy unprefixed user tokens', () => {
    // Pre-tag tokens (created before commit X) used "<userId>.<ts>"
    // payload. Verify path keeps accepting them so emails sent during
    // the rollout window don't suddenly fail.
    const issuedAt = Math.floor(Date.now() / 1000)
    const payload = `legacy-user-7.${issuedAt}`
    const sig = crypto.createHmac('sha256', 'test-secret-do-not-ship').update(payload).digest()
    const b64 = (b: Buffer) => b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    const token = `${b64(Buffer.from(payload))}.${b64(sig)}`
    expect(verifyUnsubscribeToken(token)).toEqual({ kind: 'user', userId: 'legacy-user-7' })
  })
})

describe('unsubscribe-token (email variant)', () => {
  it('round-trips a valid email', () => {
    const token = createEmailUnsubscribeToken('user@example.com')
    const result = verifyUnsubscribeToken(token)
    expect(result).toEqual({ kind: 'email', email: 'user@example.com' })
  })

  it('lowercases on issue and verify so case-mismatch does not fail-closed', () => {
    const token = createEmailUnsubscribeToken('User@Example.COM')
    expect(verifyUnsubscribeToken(token)).toEqual({ kind: 'email', email: 'user@example.com' })
  })

  it('rejects an email token signed with a different key', () => {
    const token = createEmailUnsubscribeToken('a@b.com')
    process.env.CRON_SECRET = 'different'
    expect(verifyUnsubscribeToken(token)).toBeNull()
  })

  it('does not confuse email tokens with user-id tokens', () => {
    const userTok = createUnsubscribeToken('id-1')
    const emailTok = createEmailUnsubscribeToken('a@b.com')
    expect(verifyUnsubscribeToken(userTok)).toMatchObject({ kind: 'user' })
    expect(verifyUnsubscribeToken(emailTok)).toMatchObject({ kind: 'email' })
  })
})
