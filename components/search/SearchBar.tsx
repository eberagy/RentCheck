'use client'

import { useRef, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, MapPin, Building2, Loader2 } from 'lucide-react'
import { useSearch } from '@/hooks/useSearch'
import { cn } from '@/lib/utils'

interface SearchBarProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  placeholder?: string
  autoFocus?: boolean
}

export function SearchBar({ className, size = 'md', placeholder, autoFocus }: SearchBarProps) {
  const router = useRouter()
  const { query, results, loading, handleQueryChange, clear } = useSearch()
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const sizeClasses = {
    sm: 'h-9 text-sm',
    md: 'h-11 text-base',
    lg: 'h-14 text-lg',
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setOpen(false)
    router.push(`/search?q=${encodeURIComponent(query.trim())}`)
  }

  function handleViewAllResults() {
    if (!query.trim()) return
    setOpen(false)
    router.push(`/search?q=${encodeURIComponent(query.trim())}`)
  }

  function handleSelect(result: (typeof results)[number]) {
    clear()
    setOpen(false)
    if (result.result_type === 'landlord' && result.slug) {
      router.push(`/landlord/${result.slug}`)
    } else {
      router.push(`/property/${result.id}`)
    }
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <form onSubmit={handleSubmit}>
        <div className={cn(
          'flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 shadow-[0_14px_36px_rgba(15,23,42,0.06)] transition-all sm:px-4',
          sizeClasses[size],
          open && results.length > 0
            ? 'rounded-b-none border-navy-300 shadow-[0_18px_44px_rgba(15,23,42,0.08)]'
            : 'hover:border-slate-300 focus-within:border-navy-300 focus-within:shadow-[0_18px_44px_rgba(15,23,42,0.08)]'
        )}>
          {loading
            ? <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin text-slate-400" />
            : <Search className="h-4 w-4 flex-shrink-0 text-slate-400" />
          }
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { handleQueryChange(e.target.value); setOpen(true) }}
            onFocus={() => query.length >= 2 && setOpen(true)}
            placeholder={placeholder ?? 'Search by landlord name, address, company, or city…'}
            autoFocus={autoFocus}
            className="flex-1 bg-transparent outline-none text-slate-950 placeholder:text-slate-400"
            autoComplete="off"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => { clear(); setOpen(false) }}
              className="rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            type="submit"
            aria-label="Search"
            className={cn(
              'flex-shrink-0 rounded-xl bg-slate-950 font-semibold text-white transition-colors hover:bg-navy-700',
              size === 'lg' ? 'px-5 py-2 text-sm' : 'px-3.5 py-1.5 text-xs sm:px-4'
            )}
          >
            Search
          </button>
        </div>
      </form>

      {/* Autocomplete dropdown */}
      {open && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 max-h-80 overflow-y-auto overflow-hidden rounded-b-2xl border border-t-0 border-navy-300 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
          {results.map(result => (
            <button
              key={result.id}
              type="button"
              onClick={() => handleSelect(result)}
              className="flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left transition-colors hover:bg-navy-50 last:border-0"
            >
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100">
                {result.result_type === 'landlord'
                  ? <Building2 className="h-4 w-4 text-navy-600" />
                  : <MapPin className="h-4 w-4 text-teal-600" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-slate-950">{result.display_name}</p>
                <p className="text-xs text-slate-500">
                  {result.result_type === 'landlord' ? 'Landlord' : 'Property'} ·{' '}
                  {[result.city, result.state_abbr].filter(Boolean).join(', ')}
                  {result.review_count != null && result.review_count > 0 && ` · ${result.review_count} reviews`}
                </p>
                {result.summary && (
                  <p className="mt-0.5 line-clamp-2 text-xs text-slate-600">{result.summary}</p>
                )}
              </div>
              {result.avg_rating != null && result.avg_rating > 0 && (
                <span className="flex-shrink-0 text-xs font-semibold text-amber-600">
                  ★ {result.avg_rating.toFixed(1)}
                </span>
              )}
            </button>
          ))}
          <div className="border-t border-slate-100 bg-slate-50 px-4 py-2.5">
            <button
              type="button"
              onClick={handleViewAllResults}
              className="inline-flex items-center gap-1 text-xs font-medium text-navy-600 transition-colors hover:text-navy-800"
            >
              See all results for &ldquo;{query}&rdquo; →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
