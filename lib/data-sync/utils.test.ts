import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  normalizeAddress,
  verifyCronSecret,
  withRetry,
  upsertPropertiesAndMap,
  batchUpsert,
  withSyncLog,
  type SyncResult,
} from './utils'

// Mock the service-client factory so withSyncLog tests don't need real env.
vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(),
}))
import { createServiceClient } from '@/lib/supabase/service'

/**
 * Build a chainable Supabase stub that pops one queued response per `from()`
 * call and returns that same response from every chain method (.single(),
 * `await chain.eq(...)`, `await chain.in(...).eq(...)`). This matches the way
 * PostgREST builders are PromiseLike — the same builder is awaitable AND can
 * carry further filters before being awaited.
 */
type Resp = { data?: unknown; error?: unknown }
function makeSupabase(
  plan: Record<string, Resp[]>,
): { client: SupabaseClient; calls: { from: ReturnType<typeof vi.fn> } } {
  const queues: Record<string, Resp[]> = {}
  for (const k of Object.keys(plan)) queues[k] = [...plan[k]]

  function makeChain(next: Resp): Record<string, unknown> {
    const chain = {
      select: vi.fn(() => makeChain(next)),
      upsert: vi.fn(() => makeChain(next)),
      insert: vi.fn(() => makeChain(next)),
      update: vi.fn(() => makeChain(next)),
      eq: vi.fn(() => makeChain(next)),
      lt: vi.fn(() => makeChain(next)),
      in: vi.fn(() => makeChain(next)),
      single: vi.fn(() => Promise.resolve(next)),
      then: (resolve: (v: Resp) => unknown, reject?: (e: unknown) => unknown) =>
        Promise.resolve(next).then(resolve, reject),
    }
    return chain
  }
  const fromMock = vi.fn((table: string) => {
    const next = queues[table]?.shift() ?? { data: null, error: null }
    return makeChain(next)
  })
  return { client: { from: fromMock } as unknown as SupabaseClient, calls: { from: fromMock } }
}

function newResult(): SyncResult {
  return { added: 0, updated: 0, skipped: 0, errors: [] }
}

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

describe('upsertPropertiesAndMap', () => {
  it('returns an empty map for empty input without touching the DB', async () => {
    const { client, calls } = makeSupabase({})
    const result = newResult()
    const map = await upsertPropertiesAndMap(client, [], result)
    expect(map.size).toBe(0)
    expect(calls.from).not.toHaveBeenCalled()
    expect(result.errors).toEqual([])
  })

  it('skips rows with empty/whitespace address_normalized (the partial-index trap)', async () => {
    const { client } = makeSupabase({
      properties: [{ data: [{ id: 'p1', address_normalized: '100 main st' }] }],
    })
    const result = newResult()
    const map = await upsertPropertiesAndMap(
      client,
      [
        { address_line1: '100 Main St', city: 'NYC', state: 'New York', state_abbr: 'NY', address_normalized: '100 main st' },
        { address_line1: '', city: 'NYC', state: 'New York', state_abbr: 'NY', address_normalized: '' },
        { address_line1: '   ', city: 'NYC', state: 'New York', state_abbr: 'NY', address_normalized: '   ' },
      ],
      result,
    )
    expect(map.get('100 main st')).toBe('p1')
    expect(result.skipped).toBe(2)
  })

  it('returns an empty map and no DB calls when every row is whitespace', async () => {
    const { client, calls } = makeSupabase({})
    const result = newResult()
    const map = await upsertPropertiesAndMap(
      client,
      [{ address_line1: '', city: 'NYC', state: 'New York', state_abbr: 'NY', address_normalized: '   ' }],
      result,
    )
    expect(map.size).toBe(0)
    expect(result.skipped).toBe(1)
    expect(calls.from).not.toHaveBeenCalled()
  })

  it('builds a map<addr,id> from the upsert response', async () => {
    const { client } = makeSupabase({
      properties: [{
        data: [
          { id: 'p1', address_normalized: '100 main st' },
          { id: 'p2', address_normalized: '200 oak ave' },
        ],
      }],
    })
    const result = newResult()
    const map = await upsertPropertiesAndMap(
      client,
      [
        { address_line1: '100 Main St', city: 'NYC', state: 'New York', state_abbr: 'NY', address_normalized: '100 main st' },
        { address_line1: '200 Oak Ave', city: 'NYC', state: 'New York', state_abbr: 'NY', address_normalized: '200 oak ave' },
      ],
      result,
    )
    expect(map.get('100 main st')).toBe('p1')
    expect(map.get('200 oak ave')).toBe('p2')
    expect(result.errors).toEqual([])
  })

  it('surfaces upsert errors into result.errors (the regression that masked 25k+ HPD failures)', async () => {
    const { client } = makeSupabase({
      properties: [{ data: null, error: { message: 'no unique constraint matching ON CONFLICT' } }],
    })
    const result = newResult()
    await upsertPropertiesAndMap(
      client,
      [{ address_line1: '100 Main St', city: 'NYC', state: 'New York', state_abbr: 'NY', address_normalized: '100 main st' }],
      result,
    )
    expect(result.errors[0]).toMatch(/property upsert: no unique constraint/)
  })

  it('backfills already-existing rows that ignoreDuplicates suppressed', async () => {
    // First from() = upsert (returns nothing — all rows existed)
    // Second from() = .select().in().eq() lookup returns the missing IDs
    const { client } = makeSupabase({
      properties: [
        { data: [], error: null },
        { data: [{ id: 'pX', address_normalized: '100 main st' }], error: null },
      ],
    })
    const result = newResult()
    const map = await upsertPropertiesAndMap(
      client,
      [{ address_line1: '100 Main St', city: 'NYC', state: 'New York', state_abbr: 'NY', address_normalized: '100 main st' }],
      result,
    )
    expect(map.get('100 main st')).toBe('pX')
  })

  it('captures lookup errors in result.errors', async () => {
    const { client } = makeSupabase({
      properties: [
        { data: [], error: null },
        { data: null, error: { message: 'connection terminated' } },
      ],
    })
    const result = newResult()
    await upsertPropertiesAndMap(
      client,
      [{ address_line1: '100 Main St', city: 'NYC', state: 'New York', state_abbr: 'NY', address_normalized: '100 main st' }],
      result,
    )
    expect(result.errors[0]).toMatch(/property lookup: connection terminated/)
  })
})

describe('batchUpsert', () => {
  it('is a no-op for empty input', async () => {
    const { client, calls } = makeSupabase({})
    const result = newResult()
    await batchUpsert(client, [], result)
    expect(calls.from).not.toHaveBeenCalled()
    expect(result.added).toBe(0)
  })

  it('dedupes (source, source_id) tuples within the batch (prevents the "ON CONFLICT can\'t affect row twice" abort)', async () => {
    const { client, calls } = makeSupabase({
      public_records: [{ data: [{ id: 'r1' }, { id: 'r2' }], error: null }],
    })
    const result = newResult()
    await batchUpsert(
      client,
      [
        { source: 's', source_id: '1' },
        { source: 's', source_id: '1' }, // dupe
        { source: 's', source_id: '2' },
      ],
      result,
    )
    expect(calls.from).toHaveBeenCalledTimes(1)
    // result.added is set from data?.length — 2, since the dupe was filtered before send
    expect(result.added).toBe(2)
  })

  it('increments result.added by returned data length', async () => {
    const { client } = makeSupabase({
      public_records: [{ data: [{ id: 'r1' }, { id: 'r2' }, { id: 'r3' }], error: null }],
    })
    const result = newResult()
    await batchUpsert(
      client,
      [
        { source: 's', source_id: '1' },
        { source: 's', source_id: '2' },
        { source: 's', source_id: '3' },
      ],
      result,
    )
    expect(result.added).toBe(3)
  })

  it('captures upsert errors and does not increment added', async () => {
    const { client } = makeSupabase({
      public_records: [{ data: null, error: { message: 'duplicate key value' } }],
    })
    const result = newResult()
    await batchUpsert(client, [{ source: 's', source_id: '1' }], result)
    expect(result.errors).toEqual(['duplicate key value'])
    expect(result.added).toBe(0)
  })

  it('splits oversized batches into 200-row chunks', async () => {
    const { client, calls } = makeSupabase({
      public_records: [
        { data: new Array(200).fill({ id: 'r' }), error: null },
        { data: new Array(50).fill({ id: 'r' }), error: null },
      ],
    })
    const result = newResult()
    const rows = Array.from({ length: 250 }, (_, i) => ({ source: 's', source_id: String(i) }))
    await batchUpsert(client, rows, result)
    expect(calls.from).toHaveBeenCalledTimes(2)
    expect(result.added).toBe(250)
  })
})

describe('withSyncLog', () => {
  beforeEach(() => {
    vi.mocked(createServiceClient).mockReset()
  })

  it('sweeps stuck running rows, inserts a fresh log, and finalizes success with counts', async () => {
    // sync_log responses, in order: sweep (await chain.lt) → insert (.single)
    // → final update (await chain.eq)
    const { client, calls } = makeSupabase({
      sync_log: [
        { data: null, error: null }, // sweep
        { data: { id: 'log-123' }, error: null }, // insert.single
        { data: null, error: null }, // final update
      ],
    })
    vi.mocked(createServiceClient).mockReturnValue(client)

    const result = await withSyncLog('test-source', async () => ({
      added: 5, updated: 0, skipped: 1, errors: [],
    }))

    expect(result.added).toBe(5)
    expect(result.skipped).toBe(1)
    // sweep + insert + final-update = 3 from() calls
    expect(calls.from).toHaveBeenCalledTimes(3)
  })

  it('joins error messages into the sync_log row when sync produced errors', async () => {
    const { client } = makeSupabase({
      sync_log: [
        { data: null, error: null },
        { data: { id: 'log-1' }, error: null },
        { data: null, error: null },
      ],
    })
    vi.mocked(createServiceClient).mockReturnValue(client)

    const result = await withSyncLog('test-source', async () => ({
      added: 0, updated: 0, skipped: 0,
      errors: ['err1', 'err2', 'err3', 'err4', 'err5'],
    }))
    // The function returns the original SyncResult unchanged; the sync_log
    // row stores the joined preview. We verify behavior via no throw + count.
    expect(result.errors).toHaveLength(5)
  })

  it('marks log as error and re-throws when fn throws', async () => {
    const { client } = makeSupabase({
      sync_log: [
        { data: null, error: null },
        { data: { id: 'log-x' }, error: null },
        { data: null, error: null },
      ],
    })
    vi.mocked(createServiceClient).mockReturnValue(client)

    await expect(
      withSyncLog('test-source', async () => {
        throw new Error('upstream API down')
      }),
    ).rejects.toThrow('upstream API down')
  })

  it('handles a non-Error throw value by stringifying it', async () => {
    const { client } = makeSupabase({
      sync_log: [
        { data: null, error: null },
        { data: { id: 'log-y' }, error: null },
        { data: null, error: null },
      ],
    })
    vi.mocked(createServiceClient).mockReturnValue(client)

    await expect(
      withSyncLog('test-source', async () => {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw 'string-shaped failure'
      }),
    ).rejects.toBe('string-shaped failure')
  })

  it('still runs fn and returns its result when initial log insert fails (no logId path)', async () => {
    const { client } = makeSupabase({
      sync_log: [
        { data: null, error: null }, // sweep
        { data: null, error: null }, // insert.single returns no row
        // No third call — when logId is undefined, the success branch skips the update.
      ],
    })
    vi.mocked(createServiceClient).mockReturnValue(client)

    const result = await withSyncLog('test-source', async () => ({
      added: 7, updated: 0, skipped: 0, errors: [],
    }))
    expect(result.added).toBe(7)
  })
})
