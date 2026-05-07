'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type { SearchResult } from '@/types'

// We hit /api/search via fetch (which goes through the route's
// rate-limit + service client), not via the browser supabase client.
export function useSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()
  const abortRef = useRef<AbortController | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    return () => {
      mountedRef.current = false
      clearTimeout(debounceRef.current)
      abortRef.current?.abort()
    }
  }, [])

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return }
    // Cancel any in-flight request so a slow earlier response can't
    // overwrite a fast newer one (stale-while-revalidate footgun).
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac
    setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=8`, { signal: ac.signal })
      const data = await res.json()
      if (!mountedRef.current || ac.signal.aborted) return
      setResults(data.results ?? [])
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return
      if (mountedRef.current) setResults([])
    } finally {
      if (mountedRef.current && abortRef.current === ac) setLoading(false)
    }
  }, [])

  const handleQueryChange = useCallback((q: string) => {
    setQuery(q)
    clearTimeout(debounceRef.current)
    if (q.length < 2) {
      abortRef.current?.abort()
      setResults([])
      setLoading(false)
      return
    }
    debounceRef.current = setTimeout(() => search(q), 250)
  }, [search])

  const clear = useCallback(() => {
    abortRef.current?.abort()
    clearTimeout(debounceRef.current)
    setQuery('')
    setResults([])
    setLoading(false)
  }, [])

  return { query, results, loading, handleQueryChange, clear, setQuery }
}
