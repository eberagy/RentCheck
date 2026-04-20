import { Suspense } from 'react'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { SearchBar } from '@/components/search/SearchBar'
import { LandlordCard } from '@/components/landlord/LandlordCard'
import { Skeleton } from '@/components/ui/skeleton'
import { COLLEGE_CITIES, US_STATES } from '@/types'
import type { Landlord } from '@/types'
import { SlidersHorizontal } from 'lucide-react'

interface SearchPageProps {
  searchParams: { q?: string; city?: string; state?: string; rating?: string; verified?: string; page?: string }
}

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const params = await searchParams
  const q = params.q ?? ''
  const city = params.city ?? ''
  const state = params.state ?? ''
  const title = city && state
    ? `Landlord Reviews in ${city}, ${state}`
    : q
    ? `"${q}" — Landlord Search`
    : 'Search Landlords'
  return {
    title,
    description: `Search landlord reviews${city ? ` in ${city}` : ''} on Vett. Read lease-verified renter reviews and public records.`,
    robots: { index: !!q, follow: true },
  }
}

async function SearchResults({ q, city, state, minRating, verifiedOnly, page }: {
  q: string; city: string; state: string; minRating: number; verifiedOnly: boolean; page: number
}) {
  const supabase = await createClient()
  const pageSize = 20
  const offset = (page - 1) * pageSize

  let query = supabase
    .from('landlords')
    .select('*', { count: 'exact' })
    .range(offset, offset + pageSize - 1)
    .order('review_count', { ascending: false })

  if (q) query = query.textSearch('search_vector', q, { type: 'websearch' })
  if (city) query = query.ilike('city', `%${city}%`)
  if (state) query = query.eq('state_abbr', state.toUpperCase())
  if (minRating > 0) query = query.gte('avg_rating', minRating)
  if (verifiedOnly) query = query.eq('is_verified', true)

  const { data: landlords, count } = await query
  const total = count ?? 0

  if (!landlords || landlords.length === 0) {
    return (
      <div className="py-20 text-center">
        <div className="h-14 w-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="h-7 w-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
        </div>
        <p className="text-base font-semibold text-gray-800">No landlords found</p>
        <p className="text-sm text-gray-400 mt-1">Try a different search term, city, or state</p>
        <div className="flex gap-3 justify-center mt-5 flex-wrap">
          <a href="/search" className="px-4 py-2 rounded-full border border-gray-200 text-sm font-medium hover:bg-gray-50 text-gray-600 transition-colors">
            Clear filters
          </a>
          <a href="/add-landlord" className="px-4 py-2 rounded-full bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium transition-colors">
            Add a landlord
          </a>
        </div>
      </div>
    )
  }

  return (
    <div>
      <p className="text-sm text-gray-400 mb-2">
        <span className="font-semibold text-gray-800">{total.toLocaleString()}</span>{' '}
        {total === 1 ? 'landlord' : 'landlords'} found
      </p>
      <div>
        {landlords.map((landlord: Landlord) => (
          <LandlordCard key={landlord.id} landlord={landlord} />
        ))}
      </div>
      {total > pageSize && (
        <div className="flex justify-center items-center mt-8 gap-2">
          {page > 1 && (
            <a href={`?q=${q}&city=${city}&state=${state}&rating=${minRating}&page=${page - 1}`}
               className="px-4 py-2 rounded-full border border-gray-200 text-sm font-medium hover:bg-gray-50 transition-colors">
              ← Previous
            </a>
          )}
          <span className="px-3 py-2 text-sm text-gray-400">
            Page <span className="font-medium text-gray-800">{page}</span> of {Math.ceil(total / pageSize)}
          </span>
          {page * pageSize < total && (
            <a href={`?q=${q}&city=${city}&state=${state}&rating=${minRating}&page=${page + 1}`}
               className="px-4 py-2 rounded-full border border-gray-200 text-sm font-medium hover:bg-gray-50 transition-colors">
              Next →
            </a>
          )}
        </div>
      )}
    </div>
  )
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams
  const q = params.q ?? ''
  const city = params.city ?? ''
  const state = params.state ?? ''
  const minRating = parseFloat(params.rating ?? '0')
  const verifiedOnly = params.verified === 'true'
  const page = parseInt(params.page ?? '1', 10)

  const quickCities = COLLEGE_CITIES.filter(c =>
    ['Baltimore', 'Pittsburgh', 'Philadelphia', 'New York', 'Chicago', 'Boston'].includes(c.city)
  )

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">

      {/* Title */}
      <div className="mb-6">
        {q || city ? (
          <h1 className="text-2xl font-black text-gray-900 tracking-tight mb-1">
            {q ? <>Results for &ldquo;{q}&rdquo;</> : `Landlords in ${city}${state ? `, ${state}` : ''}`}
          </h1>
        ) : (
          <h1 className="text-2xl font-black text-gray-900 tracking-tight mb-1">Search Landlords</h1>
        )}
        <p className="text-sm text-gray-400">Lease-verified reviews and public records nationwide</p>
      </div>

      {/* Search bar */}
      <div className="mb-5">
        <SearchBar size="md" className="max-w-2xl" />
      </div>

      {/* Quick city chips */}
      <div className="mb-8 flex flex-wrap gap-2">
        {quickCities.map(c => {
          const active = c.city === city && c.state === state && !q
          return (
            <a
              key={`${c.city}-${c.state}`}
              href={`/search?city=${encodeURIComponent(c.city)}&state=${c.state}`}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? 'bg-teal-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-teal-300 hover:text-teal-700'
              }`}
            >
              {c.city}, {c.state}
            </a>
          )
        })}
      </div>

      <div className="flex flex-col lg:flex-row gap-10">
        {/* Filters sidebar — minimal */}
        <aside className="lg:w-48 flex-shrink-0">
          <div className="flex items-center gap-2 mb-4">
            <SlidersHorizontal className="h-3.5 w-3.5 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-700">Filters</h3>
            {(state || minRating > 0 || verifiedOnly) && (
              <a href={q ? `?q=${q}` : '/search'} className="ml-auto text-xs text-teal-600 hover:underline font-medium">
                Clear
              </a>
            )}
          </div>
          <form method="get" className="space-y-5">
            {q && <input type="hidden" name="q" value={q} />}
            {city && <input type="hidden" name="city" value={city} />}

            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1.5">State</label>
              <select name="state" defaultValue={state}
                className="w-full text-sm border-0 border-b border-gray-200 bg-transparent py-1.5 focus:border-teal-400 focus:outline-none transition-colors text-gray-700">
                <option value="">All states</option>
                {US_STATES.map(s => (
                  <option key={s.abbr} value={s.abbr}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1.5">Min Rating</label>
              <select name="rating" defaultValue={String(minRating)}
                className="w-full text-sm border-0 border-b border-gray-200 bg-transparent py-1.5 focus:border-teal-400 focus:outline-none transition-colors text-gray-700">
                <option value="0">Any rating</option>
                <option value="2">2+ stars</option>
                <option value="3">3+ stars</option>
                <option value="4">4+ stars</option>
              </select>
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" name="verified" value="true" defaultChecked={verifiedOnly}
                className="rounded border-gray-300 text-teal-600 focus:ring-teal-400" />
              <span className="text-xs text-gray-600">Verified only</span>
            </label>

            <button type="submit"
              className="w-full text-xs font-semibold text-teal-600 border border-teal-200 rounded-full py-2 hover:bg-teal-50 transition-colors">
              Apply
            </button>
          </form>
        </aside>

        {/* Results */}
        <div className="flex-1 min-w-0">
          <Suspense fallback={
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="py-4 border-b border-gray-100">
                  <Skeleton className="h-4 w-48 mb-2" />
                  <Skeleton className="h-3 w-32 mb-3" />
                  <Skeleton className="h-3 w-full" />
                </div>
              ))}
            </div>
          }>
            <SearchResults q={q} city={city} state={state} minRating={minRating} verifiedOnly={verifiedOnly} page={page} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
