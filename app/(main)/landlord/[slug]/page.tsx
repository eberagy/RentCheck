import { cache } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Script from 'next/script'
import type { Metadata } from 'next'
import { MapPin, Globe, Phone, MessageSquare, Flag, Building2 } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/service'
import { PublicRecordsPanel } from '@/components/landlord/PublicRecordsPanel'
import { ViolationChart } from '@/components/landlord/ViolationChart'
import { VerifiedBadge } from '@/components/vett/VerifiedBadge'
import { Grade } from '@/components/vett/Grade'
import { RatingBar } from '@/components/vett/RatingBar'
import { Stars } from '@/components/vett/Stars'
import { Chip } from '@/components/vett/Chip'
import { getGradeLetter } from '@/lib/grade'
import { ReviewsList } from '@/components/review/ReviewsList'
import { WatchlistButton } from '@/components/landlord/WatchlistButton'
import { ShareButton } from '@/components/landlord/ShareButton'
// StarRating kept for potential use in sub-components
import { Button } from '@/components/ui/button'
import { cityPagePath, getCanonicalCity } from '@/lib/cities'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PUBLIC_REVIEW_SELECT } from '@/lib/reviews/public'
import { formatAddress } from '@/lib/utils'
import { canonicalSiteUrl } from '@/lib/canonical-host'
import { isValidLandlordSlug } from '@/lib/url-guards'
import { TrackPageView } from '@/components/analytics/TrackPageView'
import type { Review, PublicRecord, Property } from '@/types'

interface LandlordPageProps {
  params: { slug: string }
}

export const revalidate = 3600 // ISR: revalidate every 1 hour
// Empty generateStaticParams + dynamicParams=true tells Next.js: "no
// slugs to pre-render at build time, but treat new slugs as ISR-eligible
// at request time." Without this, Next.js classifies the route as fully
// dynamic (`ƒ`) and Vercel serves Cache-Control: private, no-cache —
// which means every hit is a fresh SSR with no caching despite the
// revalidate window.
export const dynamicParams = true
export async function generateStaticParams() {
  return []
}
// Typo'd /landlord/* URLs (anything outside the slug regex) call
// notFound() in getLandlord (see lib/url-guards.ts LANDLORD_SLUG_RE).

// Shared loader: generateMetadata + the page component both need the
// landlord row. React's `cache()` dedupes the fetch within a single
// render so we hit Supabase once instead of twice.
const getLandlord = cache(async (slug: string) => {
  // URL-shape guard. Used to live in middleware but moved here so the
  // /landlord/* matcher can be excluded — middleware running on a path
  // disqualifies it from full ISR caching on Vercel.
  if (!isValidLandlordSlug(slug)) return null
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('landlords')
    .select('*')
    .eq('slug', slug)
    .single()
  // PGRST116 = "no rows returned" — that's a legitimate 404. Anything
  // else (network, permission, syntax) is a real failure that should
  // surface to the route's error.tsx boundary, not be masked as 404.
  if (error && error.code !== 'PGRST116') throw error
  return data
})

export async function generateMetadata({ params }: LandlordPageProps): Promise<Metadata> {
  const p = await params
  const landlord = await getLandlord(p.slug)
  // Trigger 404 here as well — without this Next.js sometimes serves a
  // soft-200 with the not-found body, which hurts SEO + wastes crawl budget.
  if (!landlord) notFound()

  const location = [landlord.city, landlord.state_abbr].filter(Boolean).join(', ')
  const reviewCount = landlord.review_count ?? 0
  const hasReviews = reviewCount > 0
  const description = hasReviews
    ? `Read ${reviewCount} lease-verified renter review${reviewCount === 1 ? '' : 's'} of ${landlord.display_name}. See public records, court cases, and violation history.`
    : `Public records and renter research for ${landlord.display_name}${location ? ` in ${location}` : ''}. Be the first to write a lease-verified review.`
  const ogDescription = hasReviews
    ? `${reviewCount} renter review${reviewCount === 1 ? '' : 's'} · ${(landlord.avg_rating ?? 0).toFixed(1)} avg rating`
    : `Research ${landlord.display_name}${location ? ` in ${location}` : ''} on Vett. Lease-verified reviews + public records.`
  // Title varies by whether we have reviews — saying "X Reviews" when
  // the page has 0 reviews misrepresents the page to crawlers and users.
  const titleNoun = hasReviews ? 'Reviews' : 'Public Records'
  return {
    title: `${landlord.display_name} ${titleNoun}${location ? ` — ${location}` : ''}`,
    description,
    alternates: { canonical: `/landlord/${p.slug}` },
    openGraph: {
      title: `${landlord.display_name} ${titleNoun} | Vett`,
      description: ogDescription,
    },
  }
}

export default async function LandlordPage({ params }: LandlordPageProps) {
  const p = await params
  const supabase = createServiceClient()

  // Fetch landlord — deduped via React cache() so generateMetadata's
  // earlier call to getLandlord(p.slug) shares the same Supabase round-trip.
  const landlord = await getLandlord(p.slug)
  if (!landlord) notFound()

  // Fetch all data in parallel
  const [
    { data: reviews },
    { data: directRecords },
    { data: properties },
    { data: ratingAggregates },
  ] = await Promise.all([
    supabase
      .from('reviews')
      .select(PUBLIC_REVIEW_SELECT)
      .eq('landlord_id', landlord.id)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('public_records')
      // raw_data is needed to surface per-source detail (apartment, due
      // dates, inspector comments, citation links). Capped at 500 rows
      // means the payload stays under ~2 MB even for top-violation
      // landlords.
      .select('id, record_type, status, severity, violation_class, case_number, title, description, filed_date, closed_date, source, source_url, source_id, property_id, landlord_id, last_synced_at, raw_data, property:properties(address_line1, city, state_abbr, zip)')
      .eq('landlord_id', landlord.id)
      .order('filed_date', { ascending: false })
      .limit(500),
    supabase
      .from('properties')
      .select('*')
      .eq('landlord_id', landlord.id)
      .order('review_count', { ascending: false }),
    supabase
      .from('reviews')
      .select('rating_responsiveness, rating_maintenance, rating_honesty, rating_lease_fairness, would_rent_again, landlord_response_status')
      .eq('landlord_id', landlord.id)
      .eq('status', 'approved')
      // Cap at 1k — the rating breakdown is purely an aggregate, not a list.
      // PostgREST defaults to 1000 anyway; making it explicit guards against
      // a hot-path landlord with 5k+ reviews stalling page render.
      .limit(1000),
  ])

  // Also fetch records linked through this landlord's properties
  const propertyIds = (properties ?? []).map((p: Property) => p.id)
  let propertyRecords: PublicRecord[] = []
  if (propertyIds.length > 0) {
    const { data: propRecs } = await supabase
      .from('public_records')
      .select('id, record_type, status, severity, violation_class, case_number, title, description, filed_date, closed_date, source, source_url, source_id, property_id, landlord_id, last_synced_at, raw_data, property:properties(address_line1, city, state_abbr, zip)')
      .in('property_id', propertyIds)
      .is('landlord_id', null)
      .order('filed_date', { ascending: false })
      .limit(500)
    propertyRecords = (propRecs ?? []) as unknown as PublicRecord[]
  }

  // Compute avg sub-ratings
  const approved = ratingAggregates ?? []
  const avg = (key: keyof typeof approved[0]) => {
    const vals = approved.map(r => r[key]).filter((v): v is number => typeof v === 'number')
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
  }
  const avgResponsiveness = avg('rating_responsiveness')
  const avgMaintenance = avg('rating_maintenance')
  const avgHonesty = avg('rating_honesty')
  const avgLeaseFairness = avg('rating_lease_fairness')
  const wouldRentAgainPct = approved.length
    ? Math.round((approved.filter(r => r.would_rent_again === true).length / approved.length) * 100)
    : null
  const respondedCount = approved.filter(r =>
    (r as { landlord_response_status?: string | null }).landlord_response_status === 'approved'
  ).length
  const responseRatePct = approved.length >= 3
    ? Math.round((respondedCount / approved.length) * 100)
    : null

  // Merge direct records + property-linked records (deduplicate by id)
  const seenRecordIds = new Set<string>()
  const landlordRecords: PublicRecord[] = []
  for (const r of [...((directRecords ?? []) as unknown as PublicRecord[]), ...propertyRecords]) {
    if (!seenRecordIds.has(r.id)) {
      seenRecordIds.add(r.id)
      landlordRecords.push(r)
    }
  }

  // Per-property record summary so the Properties tab can show real
  // counts + most-recent activity instead of a single "open" pill.
  type PropertyStats = {
    total: number
    open: number
    latestFiledDate: string | null
    topType: string | null
  }
  const PROPERTY_STATS_EXCLUDE = new Set(['business_registration', 'court_case', 'lsc_eviction', 'court_listener'])
  const propertyStats = new Map<string, PropertyStats>()
  for (const rec of landlordRecords) {
    if (!rec.property_id) continue
    const cur = propertyStats.get(rec.property_id) ?? {
      total: 0, open: 0, latestFiledDate: null as string | null, topType: null as string | null,
    }
    cur.total++
    if (
      !PROPERTY_STATS_EXCLUDE.has(rec.record_type ?? '') &&
      rec.status?.toLowerCase() !== 'closed' &&
      rec.status?.toLowerCase() !== 'dismissed'
    ) cur.open++
    if (rec.filed_date && (!cur.latestFiledDate || rec.filed_date > cur.latestFiledDate)) {
      cur.latestFiledDate = rec.filed_date
    }
    propertyStats.set(rec.property_id, cur)
  }
  // Pick the dominant record_type per property (so cards can label "HPD" vs "Eviction").
  const typeTallies = new Map<string, Map<string, number>>()
  for (const rec of landlordRecords) {
    if (!rec.property_id) continue
    if (PROPERTY_STATS_EXCLUDE.has(rec.record_type ?? '')) continue
    const inner = typeTallies.get(rec.property_id) ?? new Map<string, number>()
    inner.set(rec.record_type ?? '', (inner.get(rec.record_type ?? '') ?? 0) + 1)
    typeTallies.set(rec.property_id, inner)
  }
  for (const [pid, types] of Array.from(typeTallies.entries())) {
    const cur = propertyStats.get(pid)
    if (!cur) continue
    let best = ''
    let bestN = 0
    for (const [t, n] of Array.from(types.entries())) {
      if (n > bestN) { best = t; bestN = n }
    }
    cur.topType = best || null
  }
  // Compute actual open violation count from merged records (includes property-linked ones).
  // Exclude court / informational records — only true open violations belong in this count.
  const EXCLUDED_TYPES = ['court_case', 'lsc_eviction', 'court_listener', 'business_registration']
  const openViolationCount = landlordRecords.filter(
    r => !['closed', 'dismissed'].includes(r.status ?? '') && !EXCLUDED_TYPES.includes(r.record_type ?? '')
  ).length

  // Most recent business registration (for the "Registered as" sidebar chip)
  const businessRegistration = landlordRecords.find(r => r.record_type === 'business_registration')

  const siteUrl = canonicalSiteUrl()
  const hasRatings = (landlord.avg_rating ?? 0) > 0 && (landlord.review_count ?? 0) > 0
  type ReviewLite = {
    rating_overall: number
    title?: string | null
    body?: string | null
    created_at: string
    reviewer?: { full_name?: string | null } | null
  }
  const reviewSchema = ((reviews ?? []) as ReviewLite[]).slice(0, 5).map(r => {
    const authorName = r.reviewer?.full_name?.trim() || 'Verified renter'
    return {
      '@type': 'Review',
      reviewRating: {
        '@type': 'Rating',
        ratingValue: r.rating_overall,
        bestRating: 5,
        worstRating: 1,
      },
      author: { '@type': 'Person', name: authorName },
      datePublished: r.created_at,
      name: r.title ?? undefined,
      reviewBody: r.body ?? undefined,
    }
  })
  const cityPath = landlord.city && landlord.state_abbr ? cityPagePath(landlord.city, landlord.state_abbr) : null
  const breadcrumbJsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      ...(cityPath ? [{ '@type': 'ListItem', position: 2, name: `${getCanonicalCity(landlord.city)}, ${landlord.state_abbr}`, item: `${siteUrl}${cityPath}` }] : []),
      { '@type': 'ListItem', position: cityPath ? 3 : 2, name: landlord.display_name, item: `${siteUrl}/landlord/${landlord.slug}` },
    ],
  })
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${siteUrl}/landlord/${landlord.slug}`,
    name: landlord.display_name,
    url: `${siteUrl}/landlord/${landlord.slug}`,
    ...(landlord.business_name && { legalName: landlord.business_name }),
    ...(landlord.phone && { telephone: landlord.phone }),
    ...(landlord.website && { sameAs: [landlord.website] }),
    ...(landlord.city && {
      address: {
        '@type': 'PostalAddress',
        addressLocality: landlord.city,
        ...(landlord.state_abbr && { addressRegion: landlord.state_abbr }),
        ...(landlord.zip && { postalCode: landlord.zip }),
        addressCountry: 'US',
      },
    }),
    ...(hasRatings && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: Number(landlord.avg_rating).toFixed(1),
        reviewCount: landlord.review_count,
        bestRating: 5,
        worstRating: 1,
      },
    }),
    ...(reviewSchema.length > 0 && { review: reviewSchema }),
  })

  return (
    <>
      <TrackPageView event="landlord_viewed" properties={{ landlord_id: landlord.id, slug: landlord.slug }} />
      <Script id={`landlord-jsonld-${landlord.slug}`} type="application/ld+json" strategy="beforeInteractive">
        {jsonLd}
      </Script>
      <Script id={`landlord-breadcrumb-${landlord.slug}`} type="application/ld+json" strategy="beforeInteractive">
        {breadcrumbJsonLd}
      </Script>

      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-[1320px] px-4 py-7 sm:px-8">
        {/* Breadcrumb */}
        <nav className="mb-4 flex items-center gap-1 text-xs text-slate-500">
          <Link href="/" className="transition-colors hover:text-navy-700 hover:underline">Home</Link>
          <span className="text-slate-300">›</span>
          {landlord.city && landlord.state_abbr && (
            <>
              <Link href={cityPagePath(landlord.city, landlord.state_abbr)} className="transition-colors hover:text-navy-700 hover:underline">
                {getCanonicalCity(landlord.city)}, {landlord.state_abbr}
              </Link>
              <span className="text-slate-300">›</span>
            </>
          )}
          <span className="font-medium text-slate-700">{landlord.display_name}</span>
        </nav>

        {/* Hero card. Same chrome as the property page: rounded-2xl,
            soft slate-tinted shadow, gradient accent rule. Identity
            on top, flush stat strip at the bottom. The sidebar lives
            below in a real page-level grid. */}
        <header className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="h-[3px] bg-gradient-to-r from-navy-600 via-sky-500 to-teal-500" />

          {/* Identity row — full width. At-a-glance + actions now live
              in the page-level sidebar (below) so the hero reads
              cleanly instead of being a card-on-card. */}
          <div className="px-5 py-7 sm:px-8 sm:py-8">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-navy-50 text-navy-600 ring-1 ring-navy-100">
                <Building2 className="h-7 w-7" />
              </div>
              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <h1 className="font-display text-[clamp(1.8rem,3.6vw,2.6rem)] leading-[1.05] tracking-tight text-slate-950">
                    {landlord.display_name}
                  </h1>
                  {landlord.is_verified && <VerifiedBadge label="Verified landlord" />}
                  <Grade letter={getGradeLetter(landlord.avg_rating, landlord.review_count ?? 0)} size="md" />
                </div>
                {landlord.business_name && (
                  <p className="text-[13px] text-slate-500">{landlord.business_name}</p>
                )}
                {(landlord.city || landlord.state_abbr) && (
                  <div className="flex items-center gap-1.5 text-[13.5px] text-slate-600">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    <span>{[landlord.city, landlord.state_abbr, landlord.zip].filter(Boolean).join(', ')}</span>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  {landlord.website && (
                    <Chip icon={<Globe className="h-3 w-3" />}>
                      <a href={landlord.website} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        {landlord.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                      </a>
                    </Chip>
                  )}
                  {landlord.phone && (
                    <Chip icon={<Phone className="h-3 w-3" />}>{landlord.phone}</Chip>
                  )}
                  <Chip tone="teal" icon={<Building2 className="h-3 w-3" />}>{(properties ?? []).length} properties</Chip>
                  {businessRegistration?.filed_date && (
                    <Chip icon={<Building2 className="h-3 w-3" />}>
                      Filed {new Date(businessRegistration.filed_date).getFullYear()}
                    </Chip>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Stat strip — flush cells separated by dividers, NOT
              re-bordered sub-cards inside the hero. This is the
              "non-AI" treatment the user asked for: numbers read as
              one continuous strip instead of a 4-up grid of generic
              white tiles. */}
          <div className="grid grid-cols-2 divide-x divide-slate-100 border-t border-slate-100 sm:grid-cols-4">
            {[
              { label: 'Reviews', value: landlord.review_count ?? 0, color: 'text-slate-900' },
              { label: 'Properties', value: (properties ?? []).length, color: 'text-slate-900' },
              { label: 'Public records', value: landlordRecords.length, color: 'text-amber-700' },
              { label: 'Open violations', value: openViolationCount, color: 'text-red-600' },
            ].map(s => (
              <div key={s.label} className="px-5 py-4 sm:px-6 sm:py-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{s.label}</p>
                <p className={`mt-1 font-display text-[26px] font-semibold tracking-tight tabular-nums ${s.value > 0 ? s.color : 'text-slate-300'}`}>
                  {s.value.toLocaleString()}
                </p>
              </div>
            ))}
          </div>

          {/* Landlord-authored description (only shown if claimant added one) */}
          {landlord.description && (
            <div className="border-t border-slate-100 px-5 py-5 sm:px-8">
              <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-teal-700">
                From the landlord
              </div>
              <p className="whitespace-pre-wrap text-[14px] leading-6 text-slate-700">
                {landlord.description}
              </p>
            </div>
          )}

          {/* Bio */}
          {landlord.bio && (
            <div className="border-t border-slate-100 px-5 py-5 sm:px-8">
              <p className="text-[14px] leading-6 text-slate-700">{landlord.bio}</p>
            </div>
          )}
        </header>

        {/* Violation banner */}
        {openViolationCount > 0 && (
          <div className="mb-6 flex items-start gap-3.5 rounded-2xl border border-red-200 bg-gradient-to-r from-red-50 to-orange-50 px-5 py-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-red-200 bg-red-100">
              <Flag className="h-[18px] w-[18px] text-red-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[14.5px] font-bold text-red-900">
                {openViolationCount} open violation{openViolationCount !== 1 ? 's' : ''}
                {landlord.eviction_count > 0 && ` \u00b7 ${landlord.eviction_count} eviction filing${landlord.eviction_count !== 1 ? 's' : ''} on file`}
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-orange-800">
                Pulled from public government databases. Last synced recently.
              </p>
            </div>
          </div>
        )}

        {/* Page-level main + sidebar layout. The sidebar (at-a-glance,
            actions, claim CTA) travels with the user as they scroll —
            sticky on lg+, stacks above the tabs on small screens. */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8 lg:items-start">

        <div className="min-w-0 order-2 lg:order-1">

        {/* Rating breakdown — its own section in the main column above
            the tabs. This used to be jammed inside the hero card. */}
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-[16px] font-semibold tracking-tight text-slate-900">Rating breakdown</h3>
            {wouldRentAgainPct !== null && approved.length > 0 ? (
              <p className="text-[13px] text-slate-500">
                <span className={`font-bold ${wouldRentAgainPct >= 50 ? 'text-amber-700' : 'text-red-600'}`}>
                  {wouldRentAgainPct}%
                </span>{' '}
                would rent again
              </p>
            ) : (
              <p className="text-[12px] text-slate-400">Based on {approved.length} review{approved.length === 1 ? '' : 's'}</p>
            )}
          </div>
          <div className="grid gap-x-10 gap-y-3.5 sm:grid-cols-2">
            <RatingBar label="Responsiveness" value={avgResponsiveness} />
            <RatingBar label="Maintenance" value={avgMaintenance} />
            <RatingBar label="Honesty" value={avgHonesty} />
            <RatingBar label="Lease Fairness" value={avgLeaseFairness} />
          </div>

          {responseRatePct !== null && (
            <div className="mt-5 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
              <MessageSquare className="h-4 w-4 text-slate-500" aria-hidden="true" />
              <span className="text-[13px] text-slate-700">
                Responds to <span className={`font-bold ${responseRatePct >= 50 ? 'text-teal-700' : 'text-slate-900'}`}>{responseRatePct}%</span> of reviews
                <span className="ml-1 text-slate-400">({respondedCount} of {approved.length})</span>
              </span>
            </div>
          )}
        </section>

        {/* Default tab: open whichever tab has content. A landlord with
            520 records and 0 reviews shouldn't land on an empty Reviews
            pane — keep the tab order in the UI but pick a sensible start. */}
        <Tabs
          defaultValue={
            (landlord.review_count ?? 0) > 0
              ? 'reviews'
              : landlordRecords.length > 0
                ? 'records'
                : (properties ?? []).length > 0
                  ? 'properties'
                  : 'reviews'
          }
        >
          <TabsList className="mb-5 grid w-full grid-cols-3 gap-1 rounded-2xl bg-slate-100 p-1.5">
            <TabsTrigger value="reviews" className="flex items-center justify-center rounded-xl py-3 text-[12px] sm:text-[14px] font-semibold data-[active]:bg-white data-[active]:shadow-sm">
              <MessageSquare className="mr-1.5 sm:mr-2 h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
              <span className="truncate">Reviews</span>
              <span className="ml-1 text-slate-400 hidden sm:inline">({landlord.review_count})</span>
            </TabsTrigger>
            <TabsTrigger value="records" className="flex items-center justify-center rounded-xl py-3 text-[12px] sm:text-[14px] font-semibold data-[active]:bg-white data-[active]:shadow-sm">
              <Flag className="mr-1.5 sm:mr-2 h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
              <span className="truncate">Records</span>
              <span className="ml-1 text-slate-400 hidden sm:inline">({landlordRecords.length})</span>
            </TabsTrigger>
            <TabsTrigger value="properties" className="flex items-center justify-center rounded-xl py-3 text-[12px] sm:text-[14px] font-semibold data-[active]:bg-white data-[active]:shadow-sm">
              <Building2 className="mr-1.5 sm:mr-2 h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
              <span className="truncate">Properties</span>
              <span className="ml-1 text-slate-400 hidden sm:inline">({(properties ?? []).length})</span>
            </TabsTrigger>
          </TabsList>

          {/* keepMounted on all panels so the records + properties content
              renders to static HTML (Base UI defaults to render-on-demand,
              which hid 520-record landlords from search engines and from
              users on a slow first paint). */}

          {/* Reviews tab */}
          <TabsContent value="reviews" keepMounted>
            <ReviewsList
              reviews={(reviews as unknown as Review[]) ?? []}
              landlordId={landlord.id}
              totalReviews={landlord.review_count ?? undefined}
            />
          </TabsContent>

          {/* Public records tab. ViolationChart renders full-width above
              the records list, with a 4-up summary stat strip + filter
              toolbar in between. Earlier iteration tried a sticky left
              aside inside the panel — felt cramped on small screens; the
              page-level sidebar already lives outside the tabs. */}
          <TabsContent value="records" keepMounted>
            <PublicRecordsPanel
              records={landlordRecords as PublicRecord[]}
              landlordName={landlord.display_name}
              isUnclaimed={!landlord.is_claimed}
              chart={landlordRecords.length >= 3 ? <ViolationChart records={landlordRecords} /> : null}
            />
          </TabsContent>

          {/* Properties tab */}
          <TabsContent value="properties" keepMounted>
            {(properties ?? []).length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-12 text-center">
                <Building2 className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                <p className="text-sm font-medium text-slate-600">No properties linked yet</p>
                <p className="mt-1 text-xs text-slate-400">Properties get linked automatically as public records are synced from government databases.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(properties as Property[])
                  .map(prop => ({
                    prop,
                    stats: propertyStats.get(prop.id) ?? { total: 0, open: 0, latestFiledDate: null as string | null, topType: null as string | null },
                  }))
                  .sort((a, b) => b.stats.open - a.stats.open || b.stats.total - a.stats.total)
                  .map(({ prop, stats }) => {
                    const tone = stats.open > 0 ? 'red' : stats.total > 0 ? 'amber' : 'neutral'
                    return (
                      <Link
                        key={prop.id}
                        href={`/property/${prop.id}`}
                        className="group relative block rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                      >
                        <span aria-hidden="true" className={
                          'absolute inset-y-3 left-0 w-[3px] rounded-r ' +
                          (tone === 'red' ? 'bg-red-500' : tone === 'amber' ? 'bg-amber-400' : 'bg-slate-200')
                        } />
                        <div className="ml-2 flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <p className="text-[15px] font-bold text-slate-900 group-hover:text-navy-700">
                              {formatAddress(prop.address_line1, prop.city, prop.state_abbr, prop.zip ?? undefined)}
                            </p>
                            <p className="mt-1 text-[12.5px] text-slate-500 capitalize">
                              {prop.property_type ?? 'Property'}
                              {prop.unit_count ? ` \u00b7 ${prop.unit_count} units` : ''}
                              {prop.year_built ? ` \u00b7 Built ${prop.year_built}` : ''}
                            </p>
                            {prop.review_count > 0 && (
                              <div className="mt-2 flex items-center gap-2">
                                <Stars value={prop.avg_rating} size={12} />
                                <span className="text-[12.5px] font-semibold text-slate-900">{prop.avg_rating.toFixed(1)}</span>
                                <span className="text-[11.5px] text-slate-400">{`\u00b7 ${prop.review_count} reviews`}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
                            {stats.open > 0 ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-700">
                                <Flag className="h-2.5 w-2.5" /> {stats.open.toLocaleString()} open
                              </span>
                            ) : stats.total > 0 ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                                Closed
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-500">
                                No records
                              </span>
                            )}
                            {stats.total > 0 && (
                              <span className="text-[10.5px] font-medium text-slate-500 tabular-nums">
                                {stats.total.toLocaleString()} total
                              </span>
                            )}
                          </div>
                        </div>
                        {(stats.topType || stats.latestFiledDate) && (
                          <div className="ml-2 mt-3 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2.5 text-[11px] text-slate-500">
                            {stats.topType && (
                              <span className="rounded-full bg-slate-50 px-2 py-0.5 font-medium text-slate-600 capitalize">
                                {(stats.topType ?? '').replace(/_/g, ' ')}
                              </span>
                            )}
                            {stats.latestFiledDate && (
                              <span>
                                Latest activity{' '}
                                <time dateTime={stats.latestFiledDate} className="font-semibold text-slate-700">
                                  {new Date(stats.latestFiledDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </time>
                              </span>
                            )}
                          </div>
                        )}
                      </Link>
                    )
                  })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        </div> {/* end main col */}

        {/* Sidebar — at-a-glance, actions, claim CTA. Sticky on lg+ so
            the primary CTAs travel with the reader. On mobile it
            renders ABOVE the tabs (order-1) so the score and the
            "Write a review" button are the first thing seen. */}
        <aside className="order-1 space-y-4 lg:order-2 lg:sticky lg:top-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">At a glance</p>
            {landlord.avg_rating > 0 ? (
              <div className="mt-2">
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-[44px] font-semibold leading-none tracking-[-0.02em] text-slate-950">
                    {landlord.avg_rating.toFixed(1)}
                  </span>
                  <span className="text-[12px] text-slate-400">/ 5</span>
                </div>
                <div className="mt-2"><Stars value={landlord.avg_rating} size={14} /></div>
                <p className="mt-1.5 text-[12.5px] text-slate-500">
                  {landlord.review_count} verified review{landlord.review_count === 1 ? '' : 's'}
                </p>
              </div>
            ) : (
              <div className="mt-2">
                <span className="font-display text-[44px] font-semibold leading-none tracking-[-0.02em] text-slate-300">—</span>
                <p className="mt-2 text-[12.5px] text-slate-500">No reviews yet</p>
              </div>
            )}

            <div className="mt-4 space-y-2">
              <Button
                asChild
                size="sm"
                className="h-9 w-full rounded-full bg-slate-950 text-white hover:bg-navy-700"
              >
                <Link href={`/review/new?landlord=${landlord.id}`}>Write a review</Link>
              </Button>
              <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                <WatchlistButton landlordId={landlord.id} />
                <ShareButton name={landlord.display_name} />
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-full border-slate-200 px-3 text-[12px] text-slate-600"
                >
                  <Link href={`/compare?a=${landlord.slug}`}>Compare</Link>
                </Button>
              </div>
            </div>
          </div>

          {!landlord.is_claimed && (
            <div className="rounded-2xl border border-teal-200 bg-gradient-to-b from-teal-50 to-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-teal-700">For landlords</p>
              <p className="mt-2 text-[14px] font-semibold text-slate-900">
                Are you {landlord.display_name}?
              </p>
              <p className="mt-1 text-[12.5px] leading-5 text-slate-600">
                Claim this profile to respond to reviews, add photos, and post a description.
              </p>
              <Button
                asChild
                size="sm"
                className="mt-3 h-9 w-full rounded-full bg-teal-600 text-white hover:bg-teal-700"
              >
                <Link href={`/landlord-portal/claim?landlord=${landlord.id}`}>Claim this profile</Link>
              </Button>
            </div>
          )}

          {(openViolationCount > 0 || landlord.eviction_count > 0) && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Risk signals</p>
              <ul className="mt-3 space-y-2 text-[13px]">
                {openViolationCount > 0 && (
                  <li className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-1.5 text-slate-700">
                      <Flag className="h-3.5 w-3.5 text-red-500" />
                      Open violations
                    </span>
                    <span className="font-display text-[16px] font-semibold tabular-nums text-red-600">
                      {openViolationCount.toLocaleString()}
                    </span>
                  </li>
                )}
                {landlord.eviction_count > 0 && (
                  <li className="flex items-center justify-between gap-3">
                    <span className="text-slate-700">Eviction filings</span>
                    <span className="font-display text-[16px] font-semibold tabular-nums text-slate-900">
                      {landlord.eviction_count.toLocaleString()}
                    </span>
                  </li>
                )}
                {landlordRecords.length > 0 && (
                  <li className="flex items-center justify-between gap-3">
                    <span className="text-slate-700">Total records</span>
                    <span className="font-display text-[16px] font-semibold tabular-nums text-slate-900">
                      {landlordRecords.length.toLocaleString()}
                    </span>
                  </li>
                )}
              </ul>
            </div>
          )}
        </aside>

        </div> {/* end main+sidebar grid */}
        </div>
      </div>
    </>
  )
}
