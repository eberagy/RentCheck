import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { normalizeAddress, verifyCronSecret, withRetry } from './utils'

describe('normalizeAddress', () => {
  it('lowercases the input', () => {
    expect(normalizeAddress('100 MAIN ST')).toBe('100 main st')
  })

  it('expands long-form street suffixes', () => {
    expect(normalizeAddress('100 Main Street')).toBe('100 main st')
    expect(normalizeAddress('100 Madison Avenue')).toBe('100 madison ave')
    expect(normalizeAddress('100 Lake Boulevard')).toBe('100 lake blvd')
    expect(normalizeAddress('100 Oak Drive')).toBe('100 oak dr')
    expect(normalizeAddress('100 Ridge Road')).toBe('100 ridge rd')
    expect(normalizeAddress('100 Birch Lane')).toBe('100 birch ln')
    expect(normalizeAddress('100 Park Court')).toBe('100 park ct')
    expect(normalizeAddress('100 Sterling Place')).toBe('100 sterling pl')
  })

  it('only expands whole-word suffixes', () => {
    // "streetlight" should NOT become "stlight"
    expect(normalizeAddress('Streetlight Lane')).toBe('streetlight ln')
  })

  it('collapses runs of whitespace', () => {
    expect(normalizeAddress('  1392   Sterling   Place  ')).toBe('1392 sterling pl')
  })

  it('strips dots, commas, and pound signs', () => {
    expect(normalizeAddress('100 Main St., Apt #5')).toBe('100 main st apt 5')
  })

  it('returns trimmed result with no surrounding whitespace', () => {
    expect(normalizeAddress('   100 main st   ')).toBe('100 main st')
  })

  it('matches the Postgres mirror function (used in migration 113)', () => {
    // These cases were tested in production to ensure the JS and SQL
    // implementations stay in lockstep. If this test breaks, also fix
    // supabase/migrations/113_address_normalize_function.sql.
    expect(normalizeAddress('1234 Main Street')).toBe('1234 main st')
    expect(normalizeAddress('apt #5, 1500 Adam C Powell Boulevard.')).toBe('apt 5 1500 adam c powell blvd')
  })

  it('handles empty string input', () => {
    expect(normalizeAddress('')).toBe('')
  })
})

describe('verifyCronSecret', () => {
  const ORIGINAL = process.env.CRON_SECRET

  beforeEach(() => {
    process.env.CRON_SECRET = 'test-secret-do-not-ship'
  })

  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.CRON_SECRET
    else process.env.CRON_SECRET = ORIGINAL
  })

  function makeReq(headers: Record<string, string>): Request {
    return new Request('https://x.test/api/cron/x', { headers })
  }

  it('accepts the Authorization: Bearer <secret> header (Vercel default)', () => {
    expect(verifyCronSecret(makeReq({ authorization: 'Bearer test-secret-do-not-ship' }))).toBe(true)
  })

  it('accepts the x-cron-secret header (custom triggers)', () => {
    expect(verifyCronSecret(makeReq({ 'x-cron-secret': 'test-secret-do-not-ship' }))).toBe(true)
  })

  it('rejects requests with no auth header', () => {
    expect(verifyCronSecret(makeReq({}))).toBe(false)
  })

  it('rejects a wrong bearer secret', () => {
    expect(verifyCronSecret(makeReq({ authorization: 'Bearer wrong' }))).toBe(false)
  })

  it('rejects when CRON_SECRET env is missing (fails closed)', () => {
    delete process.env.CRON_SECRET
    expect(verifyCronSecret(makeReq({ authorization: 'Bearer anything' }))).toBe(false)
  })

  it('does NOT match when bearer prefix is missing', () => {
    expect(verifyCronSecret(makeReq({ authorization: 'test-secret-do-not-ship' }))).toBe(false)
  })

  it('rejects partial-prefix attacks (constant-time guard)', () => {
    // A timing-attacker shortens the candidate to probe character-by-character.
    // The constant-time check inside verifyCronSecret should reject any
    // length-mismatched candidate without a length-discriminating early return.
    expect(verifyCronSecret(makeReq({ authorization: 'Bearer test' }))).toBe(false)
    expect(verifyCronSecret(makeReq({ authorization: 'Bearer test-secret' }))).toBe(false)
    expect(verifyCronSecret(makeReq({ 'x-cron-secret': 't' }))).toBe(false)
    expect(verifyCronSecret(makeReq({ 'x-cron-secret': 'test-secret-do-not-ship-but-longer' }))).toBe(false)
  })
})

describe('withRetry', () => {
  it('returns the value on first success', async () => {
    const fn = vi.fn().mockResolvedValue('ok')
    expect(await withRetry(fn)).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('retries on failure up to the configured limit', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('flake 1'))
      .mockRejectedValueOnce(new Error('flake 2'))
      .mockResolvedValue('finally')
    expect(await withRetry(fn, 3)).toBe('finally')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('throws the last error after exhausting retries', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('persistent'))
    await expect(withRetry(fn, 2)).rejects.toThrow('persistent')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('default retries is 3', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('bad'))
    await expect(withRetry(fn)).rejects.toThrow('bad')
    expect(fn).toHaveBeenCalledTimes(3)
  })
})
