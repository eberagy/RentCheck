// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useSearch } from './useSearch'

// Real timers + a debounce wait helper so RTL's waitFor (which itself
// uses setTimeout to poll) doesn't deadlock against fake timers.
const fetchMock = vi.fn()
const DEBOUNCE_MS = 260

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  })
}

const wait = (ms: number) => new Promise(r => setTimeout(r, ms))

describe('useSearch', () => {
  it('starts in empty state', () => {
    const { result } = renderHook(() => useSearch())
    expect(result.current.query).toBe('')
    expect(result.current.results).toEqual([])
    expect(result.current.loading).toBe(false)
  })

  it('does not fire fetch for queries under 2 chars', async () => {
    const { result } = renderHook(() => useSearch())
    act(() => result.current.handleQueryChange('a'))
    await wait(DEBOUNCE_MS + 50)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(result.current.results).toEqual([])
  })

  it('debounces fetch and exposes results on success', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ results: [{ id: '1', name: 'Acme' }] }))
    const { result } = renderHook(() => useSearch())

    act(() => result.current.handleQueryChange('acme'))
    // No fetch within the debounce window.
    await wait(100)
    expect(fetchMock).not.toHaveBeenCalled()

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(fetchMock.mock.calls[0]![0]).toContain('/api/search?q=acme')

    await waitFor(() => expect(result.current.results).toHaveLength(1))
    expect(result.current.results[0]).toMatchObject({ id: '1', name: 'Acme' })
  })

  it('treats non-2xx responses as empty results without crashing', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'rate-limited' }, { status: 429 }))
    const { result } = renderHook(() => useSearch())
    act(() => result.current.handleQueryChange('foo'))
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.results).toEqual([])
  })

  it('clear() cancels pending fetch and resets state', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ results: [{ id: '1', name: 'A' }] }))
    const { result } = renderHook(() => useSearch())

    act(() => result.current.handleQueryChange('alpha'))
    await waitFor(() => expect(result.current.results).toHaveLength(1))

    act(() => result.current.clear())
    expect(result.current.query).toBe('')
    expect(result.current.results).toEqual([])
    expect(result.current.loading).toBe(false)
  })

  it('shape-coerces non-array results to []', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ results: null }))
    const { result } = renderHook(() => useSearch())
    act(() => result.current.handleQueryChange('foo'))
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.results).toEqual([])
  })

  it('typing again before the debounce fires only sends one request', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ results: [{ id: 'final', name: 'final' }] }))
    const { result } = renderHook(() => useSearch())

    // Three keystrokes within the debounce window — only the last
    // should produce a network request. This is the typeahead spam guard.
    act(() => result.current.handleQueryChange('al'))
    await wait(50)
    act(() => result.current.handleQueryChange('alp'))
    await wait(50)
    act(() => result.current.handleQueryChange('alpha'))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(fetchMock.mock.calls[0]![0]).toContain('q=alpha')
  })
})
