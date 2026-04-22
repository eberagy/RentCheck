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
  /** Use "dark" on dark backgrounds (e.g. the homepage hero) */
  variant?: 'light' | 'dark'
}

export function SearchBar({ className, size = 'md', placeholder, autoFocus, variant = 'light' }: SearchBarProps) {
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
          'flex items-center gap-2 transition-all',
          size === 'lg' ? 'rounded-full px-5' : 'rounded-full px-4',
          sizeClasses[size],
          variant === 'dark'
            ? 'bg-white/[0.08] ring-1 ring-white/[0.12] backdrop-blur-md'
            : 'bg-white ring-1 ring-slate-200 shadow-sm',
          open && results.length > 0
            ? variant === 'dark'
              ? 'rounded-b-none ring-teal-400/40'
              : 'rounded-b-none ring-navy-300 shadow-md'
            : variant === 'dark'
              ? 'hover:ring-white/20 focus-within:ring-white/25 focus-within:bg-white/[0.10]'
              : 'hover:ring-slate-300 focus-within:ring-navy-300 focus-within:shadow-md'
        )}>
          <button
            type="submit"
            className={cn(
              'flex-shrink-0 transition-colors',
              variant === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-600'
            )}
          >
            {loading
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Search className="h-4 w-4" />
            }
          </button>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { handleQueryChange(e.target.value); setOpen(true) }}
            onFocus={() => query.length >= 2 && setOpen(true)}
            placeholder={placeholder ?? 'Search by landlord name, address, company, or city…'}
            autoFocus={autoFocus}
            className={cn(
              'flex-1 bg-transparent outline-none',
              variant === 'dark'
                ? 'text-white placeholder:text-slate-400'
                : 'text-slate-950 placeholder:text-slate-400'
            )}
            autoComplete="off"
          />
          {query && (
            <button type="button" onClick={() => { clear(); setOpen(false) }} className={cn(variant === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-600')}>
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </form>

      {/* Autocomplete dropdown */}
      {open && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 max-h-80 overflow-y-auto overflow-hidden rounded-b-3xl border border-t-0 border-navy-300 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
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
              onClick={handleSubmit as unknown as React.MouseEventHandler}
              className="text-xs font-medium text-navy-600 hover:text-navy-800"
            >
              See all results for &ldquo;{query}&rdquo; →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
