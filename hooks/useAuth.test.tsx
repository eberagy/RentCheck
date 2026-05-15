// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// Shared Supabase client mock — exposed so individual tests can rewire
// auth.getUser / from(...).single() returns and assert on subscribe/
// unsubscribe.
const authMock = {
  getUser: vi.fn(),
  onAuthStateChange: vi.fn(),
  signInWithOAuth: vi.fn(),
  signOut: vi.fn(),
}

type ProfileResp = { data: unknown; error: { code: string; message?: string } | null }
const profileResp: { value: ProfileResp } = { value: { data: null, error: null } }

const fromMock = vi.fn(() => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockImplementation(async () => profileResp.value),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: authMock, from: fromMock }),
}))

vi.mock('@/lib/sentry', () => ({
  captureException: vi.fn(),
}))

import { useAuth } from './useAuth'

const unsubscribe = vi.fn()

beforeEach(() => {
  authMock.getUser.mockReset()
  authMock.onAuthStateChange.mockReset()
  authMock.signInWithOAuth.mockReset()
  authMock.signOut.mockReset()
  fromMock.mockClear()
  unsubscribe.mockClear()
  profileResp.value = { data: null, error: null }
  authMock.onAuthStateChange.mockImplementation(() => ({
    data: { subscription: { unsubscribe } },
  }))
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('useAuth', () => {
  it('reports loading=true on mount, then resolves to signed-out when no user', async () => {
    authMock.getUser.mockResolvedValue({ data: { user: null }, error: null })
    const { result } = renderHook(() => useAuth())
    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.user).toBeNull()
    expect(result.current.profile).toBeNull()
    expect(result.current.isAdmin).toBe(false)
    expect(result.current.isLandlord).toBe(false)
  })

  it('loads the profile row when a user is present', async () => {
    authMock.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    profileResp.value = { data: { id: 'u1', user_type: 'admin', full_name: 'Admin User' }, error: null }
    const { result } = renderHook(() => useAuth())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.user).toMatchObject({ id: 'u1' })
    expect(result.current.profile).toMatchObject({ id: 'u1', user_type: 'admin' })
    expect(result.current.isAdmin).toBe(true)
  })

  it('treats PGRST116 (no profile row yet) as legitimate signed-in-no-profile', async () => {
    // Freshly-signed-in user whose profile row hasn't been created by the
    // auth callback yet. Must NOT capture as an error or strand the UI on
    // the loading skeleton.
    authMock.getUser.mockResolvedValue({ data: { user: { id: 'u2' } }, error: null })
    profileResp.value = { data: null, error: { code: 'PGRST116' } }

    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.user).toMatchObject({ id: 'u2' })
    expect(result.current.profile).toBeNull()

    const sentry = await import('@/lib/sentry')
    const captureException = vi.mocked(sentry.captureException)
    // PGRST116 should NOT have triggered a capture; only real DB errors should.
    expect(captureException).not.toHaveBeenCalled()
  })

  it('captures non-PGRST116 profile errors via Sentry', async () => {
    authMock.getUser.mockResolvedValue({ data: { user: { id: 'u3' } }, error: null })
    profileResp.value = { data: null, error: { code: '42P01', message: 'relation does not exist' } }

    renderHook(() => useAuth())
    const sentry = await import('@/lib/sentry')
    const captureException = vi.mocked(sentry.captureException)
    await waitFor(() => expect(captureException).toHaveBeenCalled())
    expect(captureException).toHaveBeenCalledWith(
      expect.objectContaining({ code: '42P01' }),
      expect.objectContaining({ where: 'useAuth:loadProfile', userId: 'u3' }),
    )
  })

  it('falls back to signed-out when getUser() rejects (network outage)', async () => {
    authMock.getUser.mockRejectedValue(new Error('Network unreachable'))
    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.user).toBeNull()
    expect(result.current.profile).toBeNull()
  })

  it('unsubscribes the auth listener on unmount', async () => {
    authMock.getUser.mockResolvedValue({ data: { user: null }, error: null })
    const { unmount } = renderHook(() => useAuth())
    await waitFor(() => expect(authMock.onAuthStateChange).toHaveBeenCalled())
    unmount()
    expect(unsubscribe).toHaveBeenCalledTimes(1)
  })

  it('does not setState after unmount (avoids the "update on unmounted component" warning)', async () => {
    // Resolve getUser AFTER unmount — mountedRef guard should prevent any
    // setState calls from running. Hard to assert directly; the indirect
    // signal is that no console error is emitted (jsdom).
    let resolveGetUser: (v: unknown) => void
    authMock.getUser.mockReturnValue(new Promise(r => { resolveGetUser = r }))

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { unmount } = renderHook(() => useAuth())
    unmount()
    act(() => resolveGetUser!({ data: { user: { id: 'late' } }, error: null }))
    await waitFor(() => expect(unsubscribe).toHaveBeenCalled())
    // No "Can't perform a React state update on an unmounted component"
    // warning from this hook's late resolution.
    const calls = errSpy.mock.calls.map(c => String(c[0]))
    expect(calls.some(s => /update on an unmounted/i.test(s))).toBe(false)
    errSpy.mockRestore()
  })
})
