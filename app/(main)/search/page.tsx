import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import { SearchBar } from '@/components/search/SearchBar'
import { LandlordCard } from '@/components/landlord/LandlordCard'
import { Skeleton } from '@/components/ui/skeleton'
import { COLLEGE_CITIES, US_STATES } from '@/types'
import type { Landlord, SearchResult } from '@/types'
import { buildLandlordSummary, buildPropertySummary, truncateSummary } from '@/lib/summaries'
import { MapPin, Search, ChevronRight, Flag } from 'lucide-react'
import { Grade } from '@/components/vett/Grade'
import { Stars } from '@/components/vett/Stars'
import { VerifiedBadge } from '@/components/vett/VerifiedBadge'
import { Chip } from '@/components/vett/Chip'
import { getGradeLetter } from '@/lib/grade'

type SortKey = 'reviewed' | 'highest' | 'lowest' | 'violations'

interface SearchPageProps {
  searchParams: { q?: string; city?: string; state?: string; rating?: string; verified?: string; page?: string; sort?: string }
}

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'reviewed', label: 'Most reviewed' },
  { key: 'highest', label: 'Highest rated' },
  { key: 'lowest', label: 'Lowest rated' },
  { key: 'violations', label: 'Most violations' },
]

function applySort<T extends { avg_rating?: number | null; review_count?: number | null; open_violation_count?: number | null }>(items: T[], sort: SortKey): T[] {
  const sorted = [...items]
  switch (sort) {
    case 'highest':
      return sorted.sort((a, b) => (b.avg_rating ?? 0) - (a.avg_rating ?? 0))
    case 'lowest':
      return sorted.sort((a, b) => {
        const ar = a.avg_rating ?? 0
        const br = b.avg_rating ?? 0
        if (ar === 0 && br === 0) return 0
        if (ar === 0) return 1
        if (br === 0) return -1
        return ar - br
      })
    case 'violations':
      return sorted.sort((a, b) => (b.open_violation_count ?? 0) - (a.open_violation_count ?? 0))
    case 'reviewed':
    default:
      return sorted.sort((a, b) => (b.review_count ?? 0) - (a.review_count ?? 0))
  }
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
  sort,
}: {
  q: string
  city: string
  state: string
  minRating: number
  verifiedOnly: boolean
  page: number
  sort: SortKey
}) {
  const supabase = createServiceClient()
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
            .select('id, display_name, avg_rating, review_count, open_violation_count, total_violation_count, eviction_count, city, state_abbr, is_verified, grade, slug')
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

    const sortedResults = applySort(results as any, sort) as typeof results
    const total = sortedResults.length
    const pageResults = sortedResults.slice(offset, offset + pageSize)
    const landlordCount = sortedResults.filter((result) => result.result_type === 'landlord').length
    const propertyCount = sortedResults.filter((result) => result.result_type === 'property').length

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
      <div className="space-y-3">
        {/* Sort toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-1">
          <div className="flex flex-wrap gap-1.5">
            {SORT_OPTIONS.map((opt) => {
              const isActive = sort === opt.key
              const qs = new URLSearchParams()
              if (q) qs.set('q', q)
              if (city) qs.set('city', city)
              if (state) qs.set('state', state)
              if (minRating > 0) qs.set('rating', String(minRating))
              if (verifiedOnly) qs.set('verified', 'true')
              if (opt.key !== 'reviewed') qs.set('sort', opt.key)
              return (
                <Link
                  key={opt.key}
                  href={`/search${qs.toString() ? `?${qs.toString()}` : ''}`}
                  aria-pressed={isActive}
                  className={`rounded-full px-3.5 py-2 text-[12.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-400 focus-visible:ring-offset-2 ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </Link>
              )
            })}
          </div>
          <span className="text-[12.5px] text-slate-500">
            {landlordCount} landlord{landlordCount !== 1 ? 's' : ''} · {propertyCount} propert{propertyCount !== 1 ? 'ies' : 'y'}
          </span>
        </div>
        {/* Result list */}
        <div className="grid gap-3">
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

  switch (sort) {
    case 'highest':
      query = query.order('avg_rating', { ascending: false, nullsFirst: false }).order('review_count', { ascending: false })
      break
    case 'lowest':
      query = query.order('avg_rating', { ascending: true, nullsFirst: false }).order('review_count', { ascending: false })
      break
    case 'violations':
      query = query.order('open_violation_count', { ascending: false, nullsFirst: false }).order('total_violation_count', { ascending: false, nullsFirst: false })
      break
    case 'reviewed':
    default:
      query = query.order('review_count', { ascending: false, nullsFirst: false }).order('total_violation_count', { ascending: false, nullsFirst: false })
      break
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
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 px-1">
          <div className="flex flex-wrap gap-1.5">
            {SORT_OPTIONS.map((opt) => {
              const isActive = sort === opt.key
              const qs = new URLSearchParams()
              if (city) qs.set('city', city)
              if (state) qs.set('state', state)
              if (minRating > 0) qs.set('rating', String(minRating))
              if (verifiedOnly) qs.set('verified', 'true')
              if (opt.key !== 'reviewed') qs.set('sort', opt.key)
              return (
                <Link
                  key={opt.key}
                  href={`/search${qs.toString() ? `?${qs.toString()}` : ''}`}
                  aria-pressed={isActive}
                  className={`rounded-full px-3.5 py-2 text-[12.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-400 focus-visible:ring-offset-2 ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </Link>
              )
            })}
          </div>
          <span className="text-[12.5px] text-slate-500">
            <b className="text-slate-900">{total.toLocaleString()}</b> {total === 1 ? 'landlord' : 'landlords'} found
          </span>
        </div>
        <div className="grid gap-3">
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
  const dbGrade = (result as any).grade as string | undefined
  const isValidGrade = dbGrade === 'A' || dbGrade === 'B' || dbGrade === 'C' || dbGrade === 'D' || dbGrade === 'F'
  const grade: 'A' | 'B' | 'C' | 'D' | 'F' = isValidGrade ? dbGrade : getGradeLetter(result.avg_rating ?? null)
  const violationCount = (result as any).open_violation_count ?? 0

  return (
    <Link href={href} className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-400 focus-visible:ring-offset-2 rounded-xl">
      <div className="grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_1fr_auto_auto] items-center gap-4 sm:gap-5 rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-[transform,box-shadow,border-color] duration-200 group-hover:border-navy-200 group-hover:shadow-md group-hover:-translate-y-0.5">
        {/* Grade badge */}
        <Grade letter={grade} size="md" />

        {/* Info */}
        <div className="min-w-0 col-span-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="truncate text-[16.5px] font-bold text-slate-900">{result.display_name}</span>
            {result.is_verified && result.result_type === 'landlord' && <VerifiedBadge small />}
            {result.result_type === 'landlord' && (
              <Chip tone="sky" className="h-5 text-[10px]">Claimed</Chip>
            )}
          </div>
          {result.summary && (
            <p className="mt-1 text-[12.5px] text-slate-500 line-clamp-1">{result.summary}</p>
          )}
          <div className="mt-2.5 flex flex-wrap items-center gap-3 text-[12.5px] text-slate-600">
            {(result.city || result.state_abbr) && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3 text-slate-400" />
                {[result.city, result.state_abbr].filter(Boolean).join(', ')}
              </span>
            )}
            {result.result_type === 'landlord' && (
              <>
                <span className="text-slate-300">&middot;</span>
                <span>{(result as any).property_count ?? 0} properties</span>
                <span className="text-slate-300">&middot;</span>
                <span>{result.review_count ?? 0} reviews</span>
              </>
            )}
            {result.result_type === 'property' && result.landlordName && (
              <>
                <span className="text-slate-300">&middot;</span>
                <span>Managed by {result.landlordName}</span>
              </>
            )}
            {violationCount > 0 && (
              <>
                <span className="text-slate-300">&middot;</span>
                <span className="inline-flex items-center gap-1 font-semibold text-red-900">
                  <Flag className="h-[11px] w-[11px] text-red-600" /> {violationCount} open
                </span>
              </>
            )}
          </div>
        </div>

        {/* Rating */}
        <div className="text-right">
          {result.avg_rating != null && result.avg_rating > 0 ? (
            <>
              <div className="text-[20px] sm:text-[22px] font-extrabold tracking-tight">{result.avg_rating.toFixed(1)}</div>
              <div className="mt-1 hidden sm:block"><Stars value={result.avg_rating} size={12} /></div>
            </>
          ) : (
            <span className="text-xs text-slate-400">No rating</span>
          )}
        </div>

        {/* Chevron */}
        <ChevronRight className="hidden sm:block h-4 w-4 text-slate-300 transition-colors group-hover:text-slate-500" aria-hidden="true" />
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
  const sortParam = (params.sort ?? 'reviewed') as SortKey
  const sort: SortKey = ['reviewed', 'highest', 'lowest', 'violations'].includes(sortParam) ? sortParam : 'reviewed'
  const priorityCities = COLLEGE_CITIES.filter((city) =>
    ['Baltimore', 'Pittsburgh', 'State College', 'Philadelphia', 'New York', 'Chicago'].includes(city.city)
  )

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Search bar band */}
      <section className="border-b border-slate-200 bg-white px-7 py-5">
        <div className="mx-auto max-w-[1180px]">
          <div className="flex items-center gap-3 border-b-2 border-slate-200 pb-3 focus-within:border-navy-400 transition-[border-color] duration-200" style={{ maxWidth: 760 }}>
            <Search className="h-[17px] w-[17px] text-slate-300 flex-shrink-0" />
            <div className="flex-1">
              <SearchBar inline />
            </div>
            {city && (
              <Chip tone="neutral">{city}{state ? `, ${state}` : ''}</Chip>
            )}
          </div>
          <div className="mt-3 text-[13px] text-slate-500">
            {q ? (
              <>
                Results matching &ldquo;<b className="text-slate-900">{q}</b>&rdquo;
                {city && <span> in {city}{state ? `, ${state}` : ''}</span>}
              </>
            ) : city ? (
              <>Browsing landlords in <b className="text-slate-900">{city}{state ? `, ${state}` : ''}</b></>
            ) : (
              <>Browse landlords by city or search above</>
            )}
          </div>
          {/* City quick-links */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {priorityCities.map((priorityCity) => {
              const active = priorityCity.city === city && priorityCity.state === state && !q
              return (
                <a
                  key={`${priorityCity.city}-${priorityCity.state}`}
                  href={`/search?city=${encodeURIComponent(priorityCity.city)}&state=${priorityCity.state}`}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    active
                      ? 'bg-slate-900 text-white'
                      : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-800'
                  }`}
                >
                  {priorityCity.city}, {priorityCity.state}
                </a>
              )
            })}
          </div>
        </div>
      </section>

      {/* Main grid: filters + results */}
      <div className="mx-auto grid max-w-[1180px] gap-7 px-7 py-7 lg:grid-cols-[240px_1fr]">
        {/* Filter sidebar */}
        <aside className="flex flex-col gap-5">
          <form method="get" className="contents">
            {q && <input type="hidden" name="q" value={q} />}
            {city && <input type="hidden" name="city" value={city} />}

            {/* Rating filter */}
            <div className="rounded-lg border border-slate-200 bg-white p-[18px]">
              <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Overall rating</div>
              <div className="grid gap-2">
                {[
                  { label: '4.0+', value: '4' },
                  { label: '3.0+', value: '3' },
                  { label: '2.0+', value: '2' },
                  { label: 'Any', value: '0' },
                ].map((opt) => (
                  <label key={opt.value} className="flex cursor-pointer items-center gap-2 text-[13px] text-slate-700">
                    <input
                      type="radio"
                      name="rating"
                      value={opt.value}
                      defaultChecked={String(minRating) === opt.value || (opt.value === '0' && minRating === 0)}
                      className="accent-teal"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Verification filter */}
            <div className="rounded-lg border border-slate-200 bg-white p-[18px]">
              <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Verification</div>
              <div className="grid gap-2">
                <label className="flex cursor-pointer items-center gap-2 text-[13px] text-slate-700">
                  <input type="checkbox" name="verified" value="true" defaultChecked={verifiedOnly} className="accent-teal" />
                  Verified landlords only
                </label>
              </div>
            </div>

            {/* State filter */}
            <div className="rounded-lg border border-slate-200 bg-white p-[18px]">
              <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">State</div>
              <select name="state" defaultValue={state} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 focus:border-teal focus:outline-none">
                <option value="">All states</option>
                {US_STATES.map(s => (
                  <option key={s.abbr} value={s.abbr}>{s.name}</option>
                ))}
              </select>
            </div>

            <button type="submit" className="rounded-full bg-teal px-4 py-2.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-teal-500">
              Apply Filters
            </button>
          </form>

          {(state || minRating > 0 || verifiedOnly) && (
            <a
              href={q ? `?q=${q}` : '/search'}
              className="self-start rounded-full border border-slate-200 bg-white px-3.5 py-2 text-[12.5px] text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-700"
            >
              Clear filters
            </a>
          )}
        </aside>

        {/* Results */}
        <div className="min-w-0">
          <Suspense fallback={
            <div className="grid gap-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
          }>
            <SearchResults q={q} city={city} state={state} minRating={minRating} verifiedOnly={verifiedOnly} page={page} sort={sort} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
