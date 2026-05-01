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
  /** Render as a bare input (no ring/shadow/padding) for embedding inside a custom container */
  inline?: boolean
}

export function SearchBar({ className, size = 'md', placeholder, autoFocus, variant = 'light', inline }: SearchBarProps) {
  const router = useRouter()
  const { query, results, loading, handleQueryChange, clear } = useSearch()
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

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
          'flex items-center',
          inline
            ? 'h-full'
            : cn(
                'rounded-full transition-all duration-200',
                size === 'lg' ? 'h-14 px-5 gap-3' : size === 'md' ? 'h-11 px-4 gap-2.5' : 'h-9 px-3 gap-2',
                variant === 'dark'
                  ? 'bg-white/[0.08] backdrop-blur-md ring-1 ring-white/[0.12] focus-within:bg-white/[0.12] focus-within:ring-white/25 focus-within:shadow-[0_0_30px_rgba(20,184,166,0.08)]'
                  : 'bg-white ring-1 ring-slate-200 shadow-sm focus-within:ring-2 focus-within:ring-navy-400 focus-within:shadow-md',
              )
        )}>
          {!inline && (
            <button
              type="submit"
              aria-label="Search"
              className={cn(
                'flex-shrink-0 transition-colors',
                variant === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-300 hover:text-slate-500'
              )}
            >
              {loading
                ? <Loader2 className={cn('animate-spin', size === 'lg' ? 'h-5 w-5' : 'h-4 w-4')} />
                : <Search className={cn(size === 'lg' ? 'h-5 w-5' : 'h-4 w-4')} />
              }
            </button>
          )}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { handleQueryChange(e.target.value); setOpen(true) }}
            onFocus={() => query.length >= 2 && setOpen(true)}
            placeholder={placeholder ?? (size === 'lg' ? 'Search landlord, address, or city...' : 'Search landlords, addresses, cities...')}
            autoFocus={autoFocus}
            aria-label="Search landlords, properties, and cities"
            className={cn(
              'flex-1 min-w-0 bg-transparent outline-none',
              size === 'lg' ? 'text-[17px]' : size === 'md' ? 'text-[15px]' : 'text-sm',
              variant === 'dark'
                ? 'text-white placeholder:text-slate-400'
                : 'text-slate-900 placeholder:text-slate-400'
            )}
            autoComplete="off"
          />
          {query ? (
            <button
              type="button"
              onClick={() => { clear(); setOpen(false) }}
              aria-label="Clear search"
              className={cn('flex-shrink-0 p-1 -m-1 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-400', variant === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-600')}
            >
              <X className="h-4 w-4" />
            </button>
          ) : size === 'lg' && !inline ? (
            <kbd className={cn(
              'hidden sm:inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium',
              variant === 'dark' ? 'bg-white/[0.06] text-slate-500' : 'bg-slate-100 text-slate-400'
            )}>
              ↵
            </kbd>
          ) : null}
        </div>
      </form>

      {/* Autocomplete dropdown */}
      {open && results.length > 0 && (
        <div
          role="listbox"
          aria-label="Search suggestions"
          className={cn(
            'absolute left-0 right-0 top-full z-50 max-h-[min(24rem,70vh)] max-w-[calc(100vw-2rem)] overflow-x-hidden overflow-y-auto overscroll-contain',
            'mt-2 rounded-2xl border bg-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]',
            variant === 'dark' ? 'border-white/10' : 'border-slate-200'
          )}
        >
          {results.map(result => (
            <button
              key={result.id}
              type="button"
              role="option"
              aria-selected="false"
              onClick={() => handleSelect(result)}
              className="flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left transition-colors hover:bg-slate-50 last:border-0 focus:outline-none focus:bg-slate-50"
            >
              <div className={cn(
                'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg',
                result.result_type === 'landlord' ? 'bg-navy-50' : 'bg-teal-50'
              )}>
                {result.result_type === 'landlord'
                  ? <Building2 className="h-3.5 w-3.5 text-navy-600" />
                  : <MapPin className="h-3.5 w-3.5 text-teal-600" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">{result.display_name}</p>
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
          <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-2.5 rounded-b-2xl">
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
