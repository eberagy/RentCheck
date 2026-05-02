import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ArrowRight, Building2, GraduationCap } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/server'
import { LandlordCard } from '@/components/landlord/LandlordCard'
import { Button } from '@/components/ui/button'
import { Eyebrow } from '@/components/vett/Eyebrow'
import { Grade } from '@/components/vett/Grade'
import { Stars } from '@/components/vett/Stars'
import { getGradeLetter } from '@/lib/grade'
import { US_STATES, COLLEGE_CITIES } from '@/types'
import type { Landlord } from '@/types'
import { getCityAliases } from '@/lib/cities'
import { CitySubscribeButton } from '@/components/city/CitySubscribeButton'
import Script from 'next/script'

export const revalidate = 3600

interface CityPageProps {
  params: { state: string; city: string }
}

function formatCityName(slug: string) {
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

export async function generateMetadata({ params }: CityPageProps): Promise<Metadata> {
  const p = await params
  const cityName = formatCityName(p.city)
  const stateAbbr = p.state.toUpperCase()
  const stateName = US_STATES.find(s => s.abbr === stateAbbr)?.name ?? stateAbbr
  return {
    title: `Landlord Reviews in ${cityName}, ${stateAbbr}`,
    description: `Read lease-verified renter reviews and public records for landlords in ${cityName}, ${stateName}. Research before you rent.`,
    alternates: { canonical: `/city/${p.state.toLowerCase()}/${p.city.toLowerCase()}` },
    openGraph: {
      title: `Landlord Reviews in ${cityName}, ${stateAbbr} | Vett`,
      description: `Research landlords in ${cityName}. Lease-verified reviews + housing violations + eviction records.`,
    },
  }
}

export default async function CityPage({ params }: CityPageProps) {
  const p = await params
  const cityName = formatCityName(p.city)
  const stateAbbr = p.state.toUpperCase()
  const stateName = US_STATES.find(s => s.abbr === stateAbbr)?.name ?? stateAbbr

  const supabase = createServiceClient()

  // Get top landlords in this city (handle metro aliases like NYC boroughs)
  const aliases = getCityAliases(cityName)
  let landlordQuery = supabase
    .from('landlords')
    .select('*', { count: 'exact' })
    .eq('state_abbr', stateAbbr)

  // Defense-in-depth: strip PostgREST filter metacharacters from any
  // alias / city slug before interpolating into .or() / .ilike().
  // Aliases come from a hardcoded lookup but the URL slug feeds into
  // the fallback path, so sanitize both.
  const sanitize = (s: string) => s.replace(/[,()*:%"]/g, '').replace(/\s+/g, ' ').trim()
  if (aliases) {
    const safeAliases = aliases.map(sanitize).filter(Boolean)
    if (safeAliases.length) {
      landlordQuery = landlordQuery.or(safeAliases.map(a => `city.ilike.%${a}%`).join(','))
    }
  } else {
    landlordQuery = landlordQuery.ilike('city', `%${sanitize(cityName)}%`)
  }

  const { data: landlords, count } = await landlordQuery
    .order('review_count', { ascending: false, nullsFirst: false })
    .order('display_name', { ascending: true })
    .limit(20)

  if (!landlords) notFound()

  // Count public records for this city. Try the cached city_stats table
  // first (refreshed nightly via cron); fall back to the live RPC if the
  // city has no cached row yet. Cache hit is sub-millisecond; live RPC
  // takes 1-20s depending on city size.
  let recordCount = 0
  if (aliases) {
    const { data: cached } = await supabase
      .from('city_stats')
      .select('city, record_count')
      .eq('state_abbr', stateAbbr)
      .in('city', aliases)
    if (cached && cached.length > 0) {
      recordCount = cached.reduce((sum, r) => sum + (r.record_count ?? 0), 0)
    } else {
      const { data: live } = await supabase.rpc('count_city_records_multi', { city_names: aliases, state_code: stateAbbr })
      recordCount = Number(live ?? 0)
    }
  } else {
    const { data: cached } = await supabase
      .from('city_stats')
      .select('record_count')
      .eq('state_abbr', stateAbbr)
      .eq('city', cityName)
      .maybeSingle()
    if (cached) {
      recordCount = cached.record_count ?? 0
    } else {
      const { data: live } = await supabase.rpc('count_city_records', { city_name: cityName, state_code: stateAbbr })
      recordCount = Number(live ?? 0)
    }
  }

  // Get college info
  const collegeInfo = COLLEGE_CITIES.find(
    c => c.city.toLowerCase() === cityName.toLowerCase() && c.state === stateAbbr
  )

  // Compute median rating for the city
  const ratings = landlords.map((l: Landlord) => l.avg_rating).filter(Boolean) as number[]
  const medianRating = ratings.length > 0
    ? ratings.sort((a, b) => a - b)[Math.floor(ratings.length / 2)]
    : null

  const topRated = [...landlords]
    .filter((l: Landlord) => (l.avg_rating ?? 0) >= 3 && (l.review_count ?? 0) > 0)
    .sort((a: Landlord, b: Landlord) => (b.avg_rating ?? 0) - (a.avg_rating ?? 0))
    .slice(0, 5)

  // Recent public-records activity in this city — surfaces the 175k+
  // government records we ingest so the page feels alive even before
  // renters review. Skip purely-informational types (business filings).
  const landlordIdsForActivity = landlords.map((l: Landlord) => l.id).slice(0, 200)
  const recentRecords = landlordIdsForActivity.length
    ? (await supabase
        .from('public_records')
        .select('id, record_type, title, severity, status, filed_date, source_url, landlord:landlords(display_name, slug)')
        .in('landlord_id', landlordIdsForActivity)
        .neq('record_type', 'business_registration')
        .order('filed_date', { ascending: false, nullsFirst: false })
        .limit(8)).data ?? []
    : []

  // CollectionPage JSON-LD — tells Google this is a directory page for
  // a specific locale, so it ranks for "{city} landlords" queries.
  const cityJsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `Landlord Reviews in ${cityName}, ${stateAbbr}`,
    url: `https://vettrentals.com/city/${stateAbbr.toLowerCase()}/${cityName.toLowerCase().replace(/\s+/g, '-')}`,
    isPartOf: { '@id': 'https://vettrentals.com/#website' },
    about: {
      '@type': 'Place',
      name: `${cityName}, ${stateName}`,
      address: {
        '@type': 'PostalAddress',
        addressLocality: cityName,
        addressRegion: stateAbbr,
        addressCountry: 'US',
      },
    },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: count ?? 0,
      itemListElement: topRated.slice(0, 5).map((l, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'LocalBusiness',
          name: l.display_name,
          url: l.slug ? `https://vettrentals.com/landlord/${l.slug}` : undefined,
          ...(l.avg_rating && (l.review_count ?? 0) > 0
            ? {
                aggregateRating: {
                  '@type': 'AggregateRating',
                  ratingValue: l.avg_rating,
                  reviewCount: l.review_count,
                  bestRating: 5,
                  worstRating: 1,
                },
              }
            : {}),
        },
      })),
    },
  })

  return (
    <div className="min-h-screen bg-slate-50">
      <Script id={`city-jsonld-${stateAbbr}-${cityName}`} type="application/ld+json" strategy="beforeInteractive">
        {cityJsonLd}
      </Script>
      {/* Hero */}
      <section
        className="relative overflow-hidden px-4 py-16 sm:px-7 text-white"
        style={{
          background: 'radial-gradient(ellipse at 20% 30%, rgba(94,148,255,0.18), transparent 45%), radial-gradient(ellipse at 80% 20%, rgba(45,212,191,0.18), transparent 40%), #07111f',
        }}
      >
        <div className="relative mx-auto max-w-[1180px]">
          <Eyebrow dark dot>{stateAbbr} &middot; {cityName} &middot; {stateName}</Eyebrow>
          <h1 className="mt-[18px] font-display text-[clamp(2.4rem,5vw,4.5rem)] leading-[1.05] tracking-tight">
            {cityName} landlords.{' '}
            <span className="text-teal-300">Verified.</span>
          </h1>
          <p className="mt-[18px] max-w-[560px] text-[16px] leading-relaxed text-slate-400">
            {count ?? 0} landlords tracked across {cityName} — every review lease-verified
            {recordCount ? `, ${recordCount.toLocaleString()} public records pulled from official sources` : ''}.
          </p>

          {/* Stats row — always show all four dimensions for consistency */}
          {(() => {
            const totalReviews = landlords.reduce((sum: number, l: Landlord) => sum + (l.review_count ?? 0), 0)
            const stats = [
              { v: (count ?? 0).toLocaleString(), l: 'Landlords' },
              { v: recordCount.toLocaleString(), l: 'Public records' },
              { v: totalReviews.toLocaleString(), l: 'Reviews' },
              { v: medianRating != null ? medianRating.toFixed(1) : '—', l: 'Median rating' },
            ]
            return (
              <div className="mt-8 grid grid-cols-2 gap-x-10 gap-y-6 sm:grid-cols-4" style={{ width: 'fit-content', maxWidth: '100%' }}>
                {stats.map(s => (
                  <div key={s.l}>
                    <div className={`text-[36px] font-extrabold tracking-tight tabular-nums ${s.v === '0' || s.v === '—' ? 'text-slate-500' : ''}`}>{s.v}</div>
                    <div className="mt-0.5 text-[12px] text-slate-500">{s.l}</div>
                  </div>
                ))}
              </div>
            )
          })()}

          {collegeInfo && (
            <div className="mt-6 flex flex-wrap gap-2">
              {collegeInfo.universities.map(uni => (
                <span key={uni} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80">
                  <GraduationCap className="h-3 w-3" />
                  {uni}
                </span>
              ))}
            </div>
          )}

          <div className="mt-6">
            <CitySubscribeButton city={cityName} stateAbbr={stateAbbr} />
          </div>
        </div>
      </section>

      {topRated.length > 0 && (
        <div className="mx-auto max-w-[1180px] px-4 sm:px-7 py-12">
          <div className="rounded-[24px] border border-slate-200 bg-white p-6">
            <div className="mb-[18px] flex items-center gap-2.5">
              <div className="h-7 w-2 rounded bg-gradient-to-b from-teal to-teal-300" />
              <h2 className="text-[18px] font-bold text-slate-900">Top-rated landlords in {cityName}</h2>
            </div>
            <div className="grid gap-2.5 md:grid-cols-2">
              {topRated.map((l: Landlord, i: number) => (
                <Link
                  key={l.id}
                  href={l.slug ? `/landlord/${l.slug}` : '/search'}
                  className="grid items-center gap-3.5 rounded-[14px] border border-slate-100 bg-slate-50 p-3 transition-colors hover:border-slate-200"
                  style={{ gridTemplateColumns: '24px auto 1fr auto' }}
                >
                  <div className="text-[14px] font-extrabold text-slate-400">{i + 1}</div>
                  {getGradeLetter(l.avg_rating ?? null, l.review_count ?? 0) ? (
                    <Grade letter={getGradeLetter(l.avg_rating ?? null, l.review_count ?? 0)} size="sm" />
                  ) : (
                    <div className="h-8 w-8 rounded-lg inline-flex items-center justify-center bg-slate-100 border border-slate-200 text-[10px] font-semibold text-slate-400">—</div>
                  )}
                  <div className="min-w-0">
                    <div className="truncate text-[13.5px] font-bold text-slate-900">{l.display_name}</div>
                    <div className="mt-0.5 text-[11.5px] text-slate-500">
                      {l.city} &middot; {l.review_count ?? 0} reviews
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[16px] font-extrabold">{l.avg_rating?.toFixed(1) ?? '—'}</div>
                    <Stars value={l.avg_rating ?? 0} size={10} />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* All landlords */}
      <div className="mx-auto max-w-[1180px] px-4 sm:px-7 pb-12">
        {landlords.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-slate-300 bg-white py-16 text-center">
            <Building2 className="mx-auto mb-4 h-12 w-12 text-slate-300" />
            <p className="text-base font-semibold text-slate-700">No landlords listed yet in {cityName}</p>
            <p className="mt-1 text-sm text-slate-400">Be the first to add one and help fellow renters.</p>
            <div className="mt-6 flex justify-center gap-3">
              <Button asChild variant="outline" className="rounded-full"><Link href="/add-landlord">Add a Landlord</Link></Button>
              <Button asChild className="rounded-full bg-teal hover:bg-teal-500 text-white"><Link href="/review/new">Write a Review</Link></Button>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">All landlords in {cityName}</div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {landlords.map((landlord: Landlord) => (
                <LandlordCard key={landlord.id} landlord={landlord} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Recent public-records activity */}
      {recentRecords.length > 0 && (
        <div className="mx-auto max-w-[1180px] px-4 sm:px-7 pb-12">
          <div className="rounded-[24px] border border-slate-200 bg-white p-6">
            <div className="mb-[18px] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-2 rounded bg-gradient-to-b from-amber-400 to-amber-200" />
                <h2 className="text-[18px] font-bold text-slate-900">Recent activity in {cityName}</h2>
              </div>
              <p className="text-[12px] text-slate-400">Last {recentRecords.length} public records</p>
            </div>
            <ul className="divide-y divide-slate-100">
              {recentRecords.map(r => {
                const landlord = r.landlord as unknown as { display_name: string; slug: string } | null
                const isClosed = r.status?.toLowerCase() === 'closed' || r.status?.toLowerCase() === 'dismissed'
                const sev = r.severity?.toLowerCase() ?? ''
                const tone = isClosed
                  ? 'border-slate-200 bg-slate-50 text-slate-500'
                  : sev === 'high' || sev === 'critical'
                    ? 'border-red-200 bg-red-50 text-red-700'
                    : sev === 'medium'
                      ? 'border-amber-200 bg-amber-50 text-amber-800'
                      : 'border-slate-200 bg-slate-50 text-slate-700'
                return (
                  <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-[13.5px] font-medium text-slate-900">{r.title}</p>
                      <p className="mt-0.5 text-[12px] text-slate-500">
                        {landlord?.slug ? (
                          <Link href={`/landlord/${landlord.slug}`} className="hover:underline">
                            {landlord.display_name}
                          </Link>
                        ) : (
                          <span>{landlord?.display_name ?? 'Unlinked landlord'}</span>
                        )}
                        {r.filed_date && <span className="ml-2 text-slate-400">· {new Date(r.filed_date).toLocaleDateString()}</span>}
                      </p>
                    </div>
                    <span className={`flex-shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize ${tone}`}>
                      {isClosed ? 'closed' : (r.status ?? 'open')}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="mx-auto max-w-[1180px] px-4 sm:px-7 pb-20">
        <div className="overflow-hidden rounded-[24px] bg-gradient-to-r from-navy-600 to-teal px-6 py-10 text-center text-white sm:px-10">
          <h2 className="text-2xl font-extrabold tracking-tight">Know a landlord in {cityName}?</h2>
          <p className="mt-2 text-sm text-white/80">Help fellow renters by sharing your lease-verified experience.</p>
          <div className="mt-6 flex justify-center gap-3">
            <Button asChild className="rounded-full bg-white text-navy-700 font-semibold hover:bg-slate-100">
              <Link href="/review/new">Write a Review <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full border-white/40 bg-white/10 text-white font-semibold hover:bg-white/20 hover:text-white">
              <Link href="/add-landlord">Add Missing Landlord</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
