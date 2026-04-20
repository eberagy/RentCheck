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
          'flex items-center gap-2 bg-white border-2 rounded-xl px-4 transition-colors',
          sizeClasses[size],
          open && results.length > 0 ? 'border-teal-500 rounded-b-none' : 'border-gray-200 hover:border-gray-300 focus-within:border-teal-400'
        )}>
          {loading
            ? <Loader2 className="h-4 w-4 text-gray-400 animate-spin flex-shrink-0" />
            : <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
          }
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { handleQueryChange(e.target.value); setOpen(true) }}
            onFocus={() => query.length >= 2 && setOpen(true)}
            placeholder={placeholder ?? 'Search by landlord name, address, company, or city…'}
            autoFocus={autoFocus}
            className="flex-1 bg-transparent outline-none text-gray-900 placeholder:text-gray-400"
            autoComplete="off"
          />
          {query && (
            <button type="button" onClick={() => { clear(); setOpen(false) }} className="text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            type="submit"
            className={cn(
              'bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold transition-colors flex-shrink-0',
              size === 'lg' ? 'px-5 py-2 text-sm' : 'px-4 py-1.5 text-xs'
            )}
          >
            Search
          </button>
        </div>
      </form>

      {/* Autocomplete dropdown */}
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 bg-white border-2 border-t-0 border-teal-500 rounded-b-xl shadow-lg overflow-hidden z-50 max-h-80 overflow-y-auto">
          {results.map(result => (
            <button
              key={result.id}
              type="button"
              onClick={() => handleSelect(result)}
              className="w-full text-left px-4 py-3 hover:bg-teal-50 transition-colors border-b border-gray-100 last:border-0 flex items-center gap-3"
            >
              <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center">
                {result.result_type === 'landlord'
                  ? <Building2 className="h-4 w-4 text-navy-600" />
                  : <MapPin className="h-4 w-4 text-teal-600" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{result.display_name}</p>
                <p className="text-xs text-gray-500">
                  {result.result_type === 'landlord' ? 'Landlord' : 'Property'} ·{' '}
                  {[result.city, result.state_abbr].filter(Boolean).join(', ')}
                  {result.review_count != null && result.review_count > 0 && ` · ${result.review_count} reviews`}
                </p>
                {result.summary && (
                  <p className="mt-0.5 text-xs text-gray-600 line-clamp-2">{result.summary}</p>
                )}
              </div>
              {result.avg_rating != null && result.avg_rating > 0 && (
                <span className="text-xs font-semibold text-amber-600 flex-shrink-0">
                  ★ {result.avg_rating.toFixed(1)}
                </span>
              )}
            </button>
          ))}
          <div className="px-4 py-2 bg-gray-50 border-t">
            <button
              type="button"
              onClick={handleSubmit as unknown as React.MouseEventHandler}
              className="text-xs text-navy-600 hover:text-navy-800 font-medium"
            >
              See all results for &ldquo;{query}&rdquo; →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
