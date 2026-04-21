import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { SearchBar } from '@/components/search/SearchBar'
import { LandlordCard } from '@/components/landlord/LandlordCard'
import { Skeleton } from '@/components/ui/skeleton'
import { COLLEGE_CITIES, US_STATES } from '@/types'
import type { Landlord, SearchResult } from '@/types'
import { buildLandlordSummary, buildPropertySummary, truncateSummary } from '@/lib/summaries'
import { Building2, MapPin, Search, Sparkles, Star } from 'lucide-react'

interface SearchPageProps {
  searchParams: { q?: string; city?: string; state?: string; rating?: string; verified?: string; page?: string }
}

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const params = await searchParams
  const q = params.q ?? ''
  const city = params.city ?? ''
  const state = params.state ?? ''
  const title = city && state
    ? `Rental Research in ${city}, ${state}`
    : q
    ? `"${q}" — Search Results`
    : 'Search Landlords and Properties'
  return {
    title,
    description: `Search landlords, properties, lease-verified renter reviews, and linked public records${city ? ` in ${city}` : ''} on Vett.`,
    robots: { index: !!(q || (city && state)), follow: true },
  }
}

type SearchPageResult = SearchResult & {
  summary?: string
  landlordName?: string | null
  landlordIsVerified?: boolean | null
}

async function SearchResults({
  q,
  city,
  state,
  minRating,
  verifiedOnly,
  page,
}: {
  q: string
  city: string
  state: string
  minRating: number
  verifiedOnly: boolean
  page: number
}) {
  const supabase = await createClient()
  const pageSize = 20
  const offset = (page - 1) * pageSize

  if (q) {
    const fetchLimit = pageSize * page
    const { data, error } = await supabase.rpc('search_all', { query: q, limit_n: fetchLimit })

    if (error) {
      return (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-5 text-sm text-red-700">
          We couldn&apos;t run this search right now. Please try again in a moment.
        </div>
      )
    }

    const rawResults = (data ?? []) as SearchPageResult[]
    const landlordIds = rawResults.filter((r) => r.result_type === 'landlord').map((r) => r.id)
    const propertyIds = rawResults.filter((r) => r.result_type === 'property').map((r) => r.id)

    const [
      { data: landlords },
      { data: properties },
      { data: propertyRecords },
    ] = await Promise.all([
      landlordIds.length
        ? supabase
            .from('landlords')
            .select('id, display_name, avg_rating, review_count, open_violation_count, total_violation_count, eviction_count, city, state_abbr, is_verified')
            .in('id', landlordIds)
        : Promise.resolve({ data: [] as any[], error: null }),
      propertyIds.length
        ? supabase
            .from('properties')
            .select('id, address_line1, avg_rating, review_count, city, state_abbr, landlord:landlords(display_name, is_verified)')
            .in('id', propertyIds)
        : Promise.resolve({ data: [] as any[], error: null }),
      propertyIds.length
        ? supabase
            .from('public_records')
            .select('property_id, title, status, filed_date')
            .in('property_id', propertyIds)
        : Promise.resolve({ data: [] as any[], error: null }),
    ])

    const landlordsById = new Map((landlords ?? []).map((landlord: any) => [landlord.id, landlord]))
    const propertiesById = new Map((properties ?? []).map((property: any) => [property.id, property]))
    const recordsByPropertyId = new Map<string, Array<{ title: string; status: string | null; filed_date: string | null }>>()

    for (const record of propertyRecords ?? []) {
      if (!record.property_id) continue
      const bucket = recordsByPropertyId.get(record.property_id) ?? []
      bucket.push(record)
      recordsByPropertyId.set(record.property_id, bucket)
    }

    const results = rawResults
      .map((result) => {
        if (result.result_type === 'landlord') {
          const landlord = landlordsById.get(result.id)
          if (!landlord) return result
          return {
            ...result,
            summary: truncateSummary(buildLandlordSummary({ landlord }), 140),
          }
        }

        const property = propertiesById.get(result.id)
        if (!property) return result

        return {
          ...result,
          landlordName: property.landlord?.display_name ?? null,
          landlordIsVerified: property.landlord?.is_verified ?? null,
          summary: truncateSummary(
            buildPropertySummary({
              property,
              landlordName: property.landlord?.display_name ?? null,
              records: recordsByPropertyId.get(result.id) ?? [],
            }),
            140
          ),
        }
      })
      .filter((result) => {
        if (city && result.city?.toLowerCase() !== city.toLowerCase()) return false
        if (state && result.state_abbr?.toLowerCase() !== state.toLowerCase()) return false
        if (minRating > 0 && (result.avg_rating ?? 0) < minRating) return false
        if (verifiedOnly) {
          if (result.result_type === 'landlord') return result.is_verified
          if (result.result_type === 'property') return result.landlordIsVerified === true
        }
        return true
      })

    const total = results.length
    const pageResults = results.slice(offset, offset + pageSize)
    const landlordCount = results.filter((result) => result.result_type === 'landlord').length
    const propertyCount = results.filter((result) => result.result_type === 'property').length

    if (pageResults.length === 0) {
      return (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-navy-50 text-navy-600">
                <Search className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">No results found</p>
                <p className="text-sm text-slate-500">Try a different address, landlord, or city.</p>
              </div>
            </div>
          </div>
          <div className="px-6 py-6">
            <div className="grid gap-3 sm:grid-cols-2">
              <a href="/search" className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50">
                Clear search
              </a>
              <a href="/add-landlord" className="inline-flex items-center justify-center rounded-xl bg-navy-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-700">
                Add a landlord
              </a>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-5">
        <div className="rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Search results</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">
                {total.toLocaleString()} matches
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {landlordCount} landlords · {propertyCount} properties · public records where available
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
              <Sparkles className="h-3.5 w-3.5 text-navy-500" />
              Lease-verified reviews and verified public records
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {pageResults.map((result) => (
            <SearchResultCard key={`${result.result_type}-${result.id}`} result={result} />
          ))}
        </div>
        {total > pageSize && (
          <div className="flex items-center justify-center gap-2 pt-2">
            {page > 1 && (
              <a
                href={`?q=${encodeURIComponent(q)}${city ? `&city=${encodeURIComponent(city)}` : ''}${state ? `&state=${encodeURIComponent(state)}` : ''}${minRating > 0 ? `&rating=${minRating}` : ''}${verifiedOnly ? '&verified=true' : ''}&page=${page - 1}`}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
              >
                ← Previous
              </a>
            )}
            <span className="px-3 py-2 text-sm text-slate-500">
              Page <span className="font-semibold text-slate-900">{page}</span> of {Math.ceil(total / pageSize)}
            </span>
            {page * pageSize < total && (
              <a
                href={`?q=${encodeURIComponent(q)}${city ? `&city=${encodeURIComponent(city)}` : ''}${state ? `&state=${encodeURIComponent(state)}` : ''}${minRating > 0 ? `&rating=${minRating}` : ''}${verifiedOnly ? '&verified=true' : ''}&page=${page + 1}`}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
              >
                Next →
              </a>
            )}
          </div>
        )}
      </div>
    )
  }

  let query = supabase
    .from('landlords')
    .select('*', { count: 'exact' })
    .range(offset, offset + pageSize - 1)
    .order('review_count', { ascending: false })

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
      <div className="space-y-4">
        <div className="rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Featured landlords</p>
          <p className="mt-1 text-sm text-slate-500">
            <span className="font-semibold text-slate-900">{total.toLocaleString()}</span>{' '}
            {total === 1 ? 'landlord' : 'landlords'} found
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {landlords.map((landlord: Landlord) => (
            <LandlordCard key={landlord.id} landlord={landlord} />
          ))}
        </div>
        {/* Pagination */}
        {total > pageSize && (
          <div className="flex items-center justify-center gap-2 pt-2">
            {page > 1 && (
              <a href={`?${city ? `city=${encodeURIComponent(city)}&` : ''}${state ? `state=${encodeURIComponent(state)}&` : ''}${minRating > 0 ? `rating=${minRating}&` : ''}${verifiedOnly ? 'verified=true&' : ''}page=${page - 1}`} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50">
                ← Previous
              </a>
            )}
            <span className="px-3 py-2 text-sm text-slate-500">
              Page <span className="font-semibold text-slate-900">{page}</span> of {Math.ceil(total / pageSize)}
            </span>
            {page * pageSize < total && (
              <a href={`?${city ? `city=${encodeURIComponent(city)}&` : ''}${state ? `state=${encodeURIComponent(state)}&` : ''}${minRating > 0 ? `rating=${minRating}&` : ''}${verifiedOnly ? 'verified=true&' : ''}page=${page + 1}`} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50">
                Next →
              </a>
            )}
        </div>
      )}
    </div>
  )
}

function SearchResultCard({ result }: { result: SearchPageResult }) {
  const href = result.result_type === 'landlord'
    ? (result.slug ? `/landlord/${result.slug}` : '/search')
    : `/property/${result.id}`
  const icon = result.result_type === 'landlord' ? <Building2 className="h-4 w-4 text-navy-600" /> : <MapPin className="h-4 w-4 text-teal-600" />
  const typeLabel = result.result_type === 'landlord' ? 'Landlord' : 'Property'

  return (
    <Link href={href} className="group block">
      <div className="h-full rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-navy-200 group-hover:shadow-lg">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-slate-100 ring-1 ring-slate-200 transition-colors group-hover:bg-navy-50 group-hover:ring-navy-100">
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-base font-semibold text-slate-900 transition-colors group-hover:text-navy-700">
                {result.display_name}
              </h3>
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                {typeLabel}
              </span>
              {result.is_verified && result.result_type === 'landlord' && (
                <span className="inline-flex items-center rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-medium text-teal-700">
                  Verified
                </span>
              )}
            </div>
            {(result.city || result.state_abbr) && (
              <p className="mt-1.5 text-xs text-slate-500">
                {[result.city, result.state_abbr].filter(Boolean).join(', ')}
                {result.result_type === 'property' && result.landlordName ? ` · Managed by ${result.landlordName}` : ''}
              </p>
            )}
            {result.summary && (
              <p className="mt-2 text-sm leading-relaxed text-slate-600 line-clamp-2">
                {result.summary}
              </p>
            )}
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex flex-wrap items-center gap-3">
            {result.avg_rating != null && result.avg_rating > 0 ? (
              <span className="inline-flex items-center gap-1.5 font-semibold text-amber-700">
                <Star className="h-3.5 w-3.5 fill-current" />
                {result.avg_rating.toFixed(1)}
              </span>
            ) : (
              <span className="text-slate-400">No rating yet</span>
            )}
            {result.review_count != null ? <span>{result.review_count} review{result.review_count === 1 ? '' : 's'}</span> : null}
          </div>
          <span className="font-medium text-navy-600">View</span>
        </div>
      </div>
    </Link>
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
  const priorityCities = COLLEGE_CITIES.filter((city) =>
    ['Baltimore', 'Pittsburgh', 'State College', 'Philadelphia', 'New York', 'Chicago'].includes(city.city)
  )

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.12),_transparent_34%),linear-gradient(180deg,_#ffffff_0%,_#f8fafc_100%)] px-5 py-6 sm:px-8 sm:py-8">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-navy-200 bg-navy-50 px-3 py-1 text-xs font-medium text-navy-700">
                <Sparkles className="h-3.5 w-3.5" />
                Search by address, landlord, or building
              </div>
              <div className="max-w-2xl space-y-3">
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                  Know before you rent.
                </h1>
                <p className="max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
                  Explore lease-verified renter reviews, public records, and landlord profiles in one place. Search by address, compare properties, and scan the details fast.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {priorityCities.map((priorityCity) => {
                  const active = priorityCity.city === city && priorityCity.state === state && !q
                  return (
                    <a
                      key={`${priorityCity.city}-${priorityCity.state}`}
                      href={`/search?city=${encodeURIComponent(priorityCity.city)}&state=${priorityCity.state}`}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                        active
                          ? 'bg-slate-950 text-white shadow-sm'
                          : 'bg-white text-slate-600 border border-slate-200 hover:border-navy-300 hover:text-navy-700'
                      }`}
                    >
                      {priorityCity.city}, {priorityCity.state}
                    </a>
                  )
                })}
              </div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">What to expect</p>
              <div className="mt-3 grid gap-3">
                {[
                  ['Addresses', 'Property pages with linked reviews and records'],
                  ['Landlords', 'Grades, summary context, and response signals'],
                  ['Records', 'Open violations and filings where available'],
                ].map(([title, description]) => (
                  <div key={title} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-sm font-semibold text-slate-900">{title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-8 flex flex-col gap-8 lg:flex-row">
        {/* Filters sidebar */}
        <aside className="lg:w-60 flex-shrink-0">
          <div className="sticky top-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-900">Filters</h3>
              {(state || minRating > 0 || verifiedOnly) && (
                <a href={q ? `?q=${q}` : '/search'} className="text-xs font-medium text-navy-600 hover:underline">
                  Clear
                </a>
              )}
            </div>
            <form method="get">
              {q && <input type="hidden" name="q" value={q} />}
              {city && <input type="hidden" name="city" value={city} />}
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">State</label>
                  <select name="state" defaultValue={state} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm transition-colors focus:border-navy-400 focus:outline-none">
                    <option value="">All states</option>
                    {US_STATES.map(s => (
                      <option key={s.abbr} value={s.abbr}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">Min Rating</label>
                  <select name="rating" defaultValue={String(minRating)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm transition-colors focus:border-navy-400 focus:outline-none">
                    <option value="0">Any rating</option>
                    <option value="2">2+ stars</option>
                    <option value="3">3+ stars</option>
                    <option value="4">4+ stars</option>
                  </select>
                </div>
                <label className="flex cursor-pointer items-center gap-2.5">
                  <input type="checkbox" name="verified" value="true" id="verified" defaultChecked={verifiedOnly} className="rounded border-slate-300 text-navy-500 focus:ring-navy-400" />
                  <span className="text-xs text-slate-600">Verified landlords only</span>
                </label>
                <button type="submit" className="w-full rounded-xl bg-navy-600 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-navy-700 active:bg-navy-800">
                  Apply Filters
                </button>
              </div>
            </form>
          </div>
        </aside>

        {/* Results */}
        <div className="min-w-0 flex-1">
          {q && (
            <div className="mb-5 rounded-[1.5rem] border border-slate-200 bg-white px-5 py-4 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Search results
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                &ldquo;{q}&rdquo;
                {city && <span className="font-normal text-slate-500"> in {city}{state ? `, ${state}` : ''}</span>}
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Compare landlords and property pages side by side, then open the page with the strongest verified signal.
              </p>
            </div>
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
    </div>
  )
}
