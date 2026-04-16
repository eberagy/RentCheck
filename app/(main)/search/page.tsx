import { Suspense } from 'react'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { SearchBar } from '@/components/search/SearchBar'
import { LandlordCard } from '@/components/landlord/LandlordCard'
import { Skeleton } from '@/components/ui/skeleton'
import { US_STATES } from '@/types'
import type { Landlord } from '@/types'

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
    description: `Search landlord reviews${city ? ` in ${city}` : ''} on RentCheck. Read verified renter reviews and public records.`,
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

  if (q) {
    query = query.textSearch('search_vector', q, { type: 'websearch' })
  }
  if (city) query = query.ilike('city', `%${city}%`)
  if (state) query = query.eq('state_abbr', state.toUpperCase())
  if (minRating > 0) query = query.gte('avg_rating', minRating)
  if (verifiedOnly) query = query.eq('is_verified', true)

  const { data: landlords, count } = await query
  const total = count ?? 0

  if (!landlords || landlords.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
        <div className="h-14 w-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="h-7 w-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
        </div>
        <p className="text-base font-semibold text-gray-800">No landlords found</p>
        <p className="text-sm text-gray-500 mt-1">Try a different search term, city, or state</p>
        <div className="flex gap-3 justify-center mt-5 flex-wrap">
          <a href="/search" className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium hover:bg-gray-50 text-gray-600">
            Clear filters
          </a>
          <a href="/add-landlord" className="px-4 py-2 rounded-lg bg-navy-500 hover:bg-navy-600 text-white text-sm font-medium">
            Add a landlord
          </a>
        </div>
      </div>
    )
  }

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        <span className="font-semibold text-gray-900">{total.toLocaleString()}</span>{' '}
        {total === 1 ? 'landlord' : 'landlords'} found
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {landlords.map((landlord: Landlord) => (
          <LandlordCard key={landlord.id} landlord={landlord} />
        ))}
      </div>
      {/* Pagination */}
      {total > pageSize && (
        <div className="flex justify-center items-center mt-8 gap-2">
          {page > 1 && (
            <a href={`?q=${q}&state=${state}&rating=${minRating}&page=${page - 1}`} className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium hover:bg-gray-50 transition-colors">
              ← Previous
            </a>
          )}
          <span className="px-3 py-2 text-sm text-gray-500">
            Page <span className="font-medium text-gray-900">{page}</span> of {Math.ceil(total / pageSize)}
          </span>
          {page * pageSize < total && (
            <a href={`?q=${q}&state=${state}&rating=${minRating}&page=${page + 1}`} className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium hover:bg-gray-50 transition-colors">
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

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Search bar */}
      <div className="mb-8">
        <SearchBar size="md" className="max-w-2xl" />
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Filters sidebar */}
        <aside className="lg:w-56 flex-shrink-0">
          <div className="bg-white border border-gray-200 rounded-xl p-4 sticky top-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 text-sm">Filters</h3>
              {(state || minRating > 0 || verifiedOnly) && (
                <a href={q ? `?q=${q}` : '/search'} className="text-xs text-navy-600 hover:underline font-medium">
                  Clear
                </a>
              )}
            </div>
            <form method="get">
              {q && <input type="hidden" name="q" value={q} />}
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1.5">State</label>
                  <select name="state" defaultValue={state} className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-2 bg-white focus:border-navy-400 focus:outline-none transition-colors">
                    <option value="">All states</option>
                    {US_STATES.map(s => (
                      <option key={s.abbr} value={s.abbr}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1.5">Min Rating</label>
                  <select name="rating" defaultValue={String(minRating)} className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-2 bg-white focus:border-navy-400 focus:outline-none transition-colors">
                    <option value="0">Any rating</option>
                    <option value="2">2+ stars</option>
                    <option value="3">3+ stars</option>
                    <option value="4">4+ stars</option>
                  </select>
                </div>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" name="verified" value="true" id="verified" defaultChecked={verifiedOnly} className="rounded border-gray-300 text-navy-500 focus:ring-navy-400" />
                  <span className="text-xs text-gray-600">Verified landlords only</span>
                </label>
                <button type="submit" className="w-full bg-navy-500 hover:bg-navy-600 active:bg-navy-700 text-white text-xs font-semibold rounded-lg py-2.5 transition-colors">
                  Apply Filters
                </button>
              </div>
            </form>
          </div>
        </aside>

        {/* Results */}
        <div className="flex-1">
          {q && (
            <h1 className="text-xl font-bold text-gray-900 mb-4">
              Results for &ldquo;{q}&rdquo;
              {city && <span className="text-gray-500 font-normal"> in {city}{state ? `, ${state}` : ''}</span>}
            </h1>
          )}
          <Suspense fallback={
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
            </div>
          }>
            <SearchResults q={q} city={city} state={state} minRating={minRating} verifiedOnly={verifiedOnly} page={page} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
