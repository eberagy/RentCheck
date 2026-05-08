import { describe, it, expect, vi } from 'vitest'
import { requireAdmin } from './admin-auth'

// Build a stub supabase client that mimics the chained .from(...).select(...).eq(...).single()
// shape requireAdmin expects.
function makeSupabase(opts: {
  user: { id: string } | null
  profile?: { user_type: string } | null
  profileError?: { code?: string; message?: string } | null
}) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: opts.user } }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: opts.profile ?? null,
            error: opts.profileError ?? null,
          }),
        }),
      }),
    }),
  } as unknown as Parameters<typeof requireAdmin>[0]
}

describe('requireAdmin', () => {
  it('returns null when signed out', async () => {
    const sb = makeSupabase({ user: null })
    expect(await requireAdmin(sb)).toBeNull()
  })

  it('returns user when profile.user_type is admin', async () => {
    const sb = makeSupabase({ user: { id: 'u1' }, profile: { user_type: 'admin' } })
    const result = await requireAdmin(sb)
    expect(result).toEqual({ id: 'u1' })
  })

  it('returns null when profile.user_type is renter', async () => {
    const sb = makeSupabase({ user: { id: 'u1' }, profile: { user_type: 'renter' } })
    expect(await requireAdmin(sb)).toBeNull()
  })

  it('returns null when profile.user_type is landlord', async () => {
    const sb = makeSupabase({ user: { id: 'u1' }, profile: { user_type: 'landlord' } })
    expect(await requireAdmin(sb)).toBeNull()
  })

  it('returns null when profile is missing (PGRST116 — no rows)', async () => {
    const sb = makeSupabase({
      user: { id: 'u1' },
      profile: null,
      profileError: { code: 'PGRST116', message: 'no rows' },
    })
    expect(await requireAdmin(sb)).toBeNull()
  })

  it('fails closed (returns null) on a real DB error — admin retries rather than escalates', async () => {
    const sb = makeSupabase({
      user: { id: 'u1' },
      profile: null,
      profileError: { code: '57014', message: 'statement timeout' },
    })
    expect(await requireAdmin(sb)).toBeNull()
  })

  it('returns null when profile is undefined', async () => {
    const sb = makeSupabase({ user: { id: 'u1' }, profile: undefined as unknown as null })
    expect(await requireAdmin(sb)).toBeNull()
  })
})
