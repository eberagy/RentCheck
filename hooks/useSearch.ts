'use client'

import { useState, useCallback, useRef } from 'react'
import type { SearchResult } from '@/types'

// We hit /api/search via fetch (which goes through the route's
// rate-limit + service client), not via the browser supabase client.
// Earlier versions instantiated createClient() here for legacy paths;
// it's been dead since the API was the only consumer.
export function useSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=8`)
      const data = await res.json()
      setResults(data.results ?? [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, []) // eslint-disable-line

  const handleQueryChange = useCallback((q: string) => {
    setQuery(q)
    clearTimeout(debounceRef.current)
    if (q.length < 2) { setResults([]); return }
    debounceRef.current = setTimeout(() => search(q), 250)
  }, [search])

  const clear = useCallback(() => {
    setQuery('')
    setResults([])
  }, [])

  return { query, results, loading, handleQueryChange, clear, setQuery }
}
