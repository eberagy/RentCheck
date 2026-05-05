import { cache } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Script from 'next/script'
import type { Metadata } from 'next'
import {
  AlertTriangle,
  Building2,
  MapPin,
  Hash,
  Calendar,
  ChevronRight,
  MessageSquare,
  User,
  ExternalLink,
  Phone,
} from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/server'
import { PublicRecordsPanel } from '@/components/landlord/PublicRecordsPanel'
import { ReviewCard } from '@/components/review/ReviewCard'
import { StarRating } from '@/components/review/StarRating'
import { VerifiedBadge } from '@/components/landlord/VerifiedBadge'
import { Button } from '@/components/ui/button'
import { WatchlistButton } from '@/components/landlord/WatchlistButton'
import { PUBLIC_REVIEW_SELECT } from '@/lib/reviews/public'
import { formatAddress } from '@/lib/utils'
import { buildPropertySummary } from '@/lib/summaries'
import { cityPagePath, getCanonicalCity } from '@/lib/cities'
import type { Review, PublicRecord } from '@/types'

interface PropertyPageProps {
  params: { id: string }
}

export const revalidate = 3600
// NOTE: notFound() in generateMetadata + page does NOT return a 404 status
// in production (Next.js 14 + Vercel quirk). The not-found.tsx body
// renders with a 200 status header, soft-404'ing into search engines.
// Tried `dynamic = 'force-dynamic'` — same result. Tracked in NEXT_SESSION;
// proper fix likely requires a middleware-level UUID validator that
// returns NextResponse with status 404 before reaching the page.

// Shared loader: generateMetadata + the page component both need the
// property row + its landlord. React cache() dedupes within a render.
const getProperty = cache(async (id: string) => {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('properties')
    .select('*, landlord:landlords(*)')
    .eq('id', id)
    .single()
  return data
})

export async function generateMetadata({ params }: PropertyPageProps): Promise<Metadata> {
  const p = await params
  const prop = await getProperty(p.id)
  // Trigger Next.js 404 from generateMetadata so the response status is 404,
  // not 200 with a "Not Found" body. Without this, soft-404s would tell
  // search engines the URL is valid and waste crawl budget.
  if (!prop) notFound()
  return {
    title: `${prop.address_line1}, ${prop.city} Reviews`,
    description: `Renter reviews and violation history for ${prop.address_line1}, ${prop.city}. ${prop.review_count} reviews.`,
    alternates: { canonical: `/property/${p.id}` },
  }
}

export default async function PropertyPage({ params }: PropertyPageProps) {
  const p = await params
  const supabase = createServiceClient()

  const property = await getProperty(p.id)
  if (!property) notFound()

  const [{ data: reviews }, { data: records }] = await Promise.all([
    supabase
      .from('reviews')
      .select(PUBLIC_REVIEW_SELECT)
      .eq('property_id', property.id)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('public_records')
      .select('*')
      .eq('property_id', property.id)
      .order('filed_date', { ascending: false })
      .limit(200),
  ])

  const landlord = property.landlord as
    | { id: string; display_name: string; slug: string; city: string | null; state_abbr: string | null; is_claimed: boolean; is_verified: boolean }
    | null
  const isUnclaimed = !landlord?.is_claimed
  // Match landlord-page logic: court / informational records aren't violations.
  const PROPERTY_OPEN_EXCLUDE = ['court_case', 'lsc_eviction', 'court_listener', 'business_registration']
  const openViolations = (records ?? []).filter(
    (r: PublicRecord) =>
      r.status?.toLowerCase() !== 'closed' &&
      r.status?.toLowerCase() !== 'dismissed' &&
      !PROPERTY_OPEN_EXCLUDE.includes(r.record_type ?? '')
  ).length

  const reviewList = (reviews ?? []) as unknown as Review[]
  const recordList = (records ?? []) as PublicRecord[]
  const propertySummary = buildPropertySummary({
    property,
    landlordName: landlord?.display_name ?? null,
    records: recordList,
  })

  // Schema.org structured data — Apartment / ApartmentComplex when units > 1.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.vettrentals.com'
  const propertyJsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': (property.unit_count ?? 1) > 1 ? 'ApartmentComplex' : 'Apartment',
    name: property.address_line1,
    url: `${siteUrl}/property/${property.id}`,
    address: {
      '@type': 'PostalAddress',
      streetAddress: property.address_line1,
      addressLocality: property.city ?? undefined,
      addressRegion: property.state_abbr ?? undefined,
      postalCode: property.zip ?? undefined,
      addressCountry: 'US',
    },
    ...(property.year_built ? { yearBuilt: property.year_built } : {}),
    ...(property.unit_count ? { numberOfRooms: property.unit_count } : {}),
    ...(property.review_count > 0 && property.avg_rating > 0 ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: property.avg_rating,
        reviewCount: property.review_count,
        bestRating: 5,
        worstRating: 1,
      },
    } : {}),
  })

  return (
    <div className="min-h-screen bg-slate-50">
      <Script id={`property-jsonld-${property.id}`} type="application/ld+json" strategy="beforeInteractive">
        {propertyJsonLd}
      </Script>
      <div className="mx-auto max-w-[1320px] px-4 py-8 sm:px-8">
        <nav className="mb-6 flex items-center gap-1 text-xs text-slate-500">
          <Link href="/" className="transition-colors hover:text-navy-700 hover:underline">
            Home
          </Link>
          <ChevronRight className="h-3 w-3 text-slate-300" />
          {property.city && property.state_abbr && (
            <>
              <Link
                href={cityPagePath(property.city, property.state_abbr)}
                className="transition-colors hover:text-navy-700 hover:underline"
              >
                {getCanonicalCity(property.city)}, {property.state_abbr}
              </Link>
              <ChevronRight className="h-3 w-3 text-slate-300" />
            </>
          )}
          <span className="font-medium text-slate-700">{property.address_line1}</span>
        </nav>

        <header className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="h-[3px] bg-gradient-to-r from-navy-600 via-sky-500 to-teal-500" />
          <div className="px-5 py-7 sm:px-8 sm:py-8">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-navy-50 text-navy-600 ring-1 ring-navy-100">
                <Building2 className="h-7 w-7" />
              </div>
              <div className="min-w-0 flex-1 space-y-3">
                <h1 className="font-display text-[clamp(1.8rem,3.6vw,2.6rem)] leading-[1.05] tracking-tight text-slate-950">
                  {property.address_line1}
                </h1>
                <p className="flex items-center gap-1.5 text-[13.5px] text-slate-600">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  {property.city}, {property.state_abbr} {property.zip}
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {property.property_type && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-navy-200 bg-navy-50 px-3 py-1 text-[12px] font-medium text-navy-700 capitalize">
                      <Building2 className="h-3 w-3" />
                      {property.property_type}
                    </span>
                  )}
                  {property.unit_count && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[12px] font-medium text-slate-600">
                      <Hash className="h-3 w-3" />
                      {property.unit_count} units
                    </span>
                  )}
                  {property.year_built && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[12px] font-medium text-slate-600">
                      <Calendar className="h-3 w-3" />
                      Built {property.year_built}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-5 border-t border-slate-100 pt-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Summary</p>
              <p className="mt-2 text-[14px] leading-6 text-slate-700">{propertySummary}</p>
            </div>
          </div>

          {openViolations > 0 && (
            <div className="flex items-start gap-2.5 border-t border-slate-100 bg-red-50/50 px-5 py-4 sm:px-8">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600" />
              <div>
                <p className="text-[14px] font-semibold text-red-700">
                  {openViolations} open violation{openViolations !== 1 ? 's' : ''}
                </p>
                <p className="mt-0.5 text-[12.5px] text-red-700/80">
                  Unresolved housing code violations on record — see public records below.
                </p>
              </div>
            </div>
          )}
        </header>

        {/* Page-level main + sidebar — same pattern as the landlord page. */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8 lg:items-start">
          <div className="min-w-0 order-2 lg:order-1">

        <div className="mb-8">
          <PublicRecordsPanel
            records={recordList}
            landlordName={landlord?.display_name ?? ''}
            isUnclaimed={isUnclaimed}
            propertyAddress={formatAddress(
              property.address_line1,
              property.city,
              property.state_abbr
            )}
          />
        </div>

        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-navy-600" />
              <h2 className="text-lg font-semibold text-slate-950">
                Renter Reviews{reviewList.length > 0 && ` (${reviewList.length})`}
              </h2>
            </div>
            <Button
              asChild
              size="sm"
              className="rounded-full bg-navy-600 text-white hover:bg-navy-700"
            >
              <Link href={`/review/new?property=${property.id}`}>Write a Review</Link>
            </Button>
          </div>

          {reviewList.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white py-16 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                <MessageSquare className="h-7 w-7 text-slate-400" />
              </div>
              <p className="text-base font-semibold text-slate-800">No reviews yet</p>
              <p className="mx-auto mt-1 max-w-xs text-sm text-slate-500">
                Be the first to share your experience living at this property and help future
                renters.
              </p>
              <Button
                asChild
                size="sm"
                className="mt-5 rounded-full bg-navy-600 text-white hover:bg-navy-700"
              >
                <Link href={`/review/new?property=${property.id}`}>Write the first review</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {reviewList.map(review => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
          )}
        </section>

        <div className="mt-10 flex flex-col items-start justify-between gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-6 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-red-100">
              <Phone className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-950">See something wrong?</p>
              <p className="mt-0.5 text-xs text-slate-500">
                Report inaccurate information, missing records, or a safety concern about this
                property.
              </p>
            </div>
          </div>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="flex-shrink-0 rounded-full border-slate-300 hover:border-red-300 hover:text-red-700"
          >
            <Link href="/contact">Report an Issue</Link>
          </Button>
        </div>

          </div> {/* end main col */}

          {/* Sidebar — at-a-glance + watch + landlord chip. Sticky on
              lg+; on mobile renders ABOVE the records (order-1) so the
              rating + watchlist CTA are first thing seen. */}
          <aside className="order-1 space-y-4 lg:order-2 lg:sticky lg:top-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">At a glance</p>
              {property.review_count > 0 ? (
                <div className="mt-2">
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-[44px] font-semibold leading-none tracking-[-0.02em] text-slate-950">
                      {property.avg_rating.toFixed(1)}
                    </span>
                    <span className="text-[12px] text-slate-400">/ 5</span>
                  </div>
                  <div className="mt-2"><StarRating value={property.avg_rating} readonly size="sm" /></div>
                  <p className="mt-1.5 text-[12.5px] text-slate-500">
                    {property.review_count} review{property.review_count === 1 ? '' : 's'}
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
                  <Link href={`/review/new?property=${property.id}`}>Write a review</Link>
                </Button>
                <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                  <WatchlistButton
                    propertyId={property.id}
                    successMessage="You'll be notified when new violations or reviews land at this address."
                  />
                </div>
              </div>
            </div>

            {landlord && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Managed by</p>
                <Link href={`/landlord/${landlord.slug}`} className="group mt-3 flex items-center gap-3">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-navy-50 text-navy-600 ring-1 ring-navy-100">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[14px] font-semibold text-slate-900 group-hover:text-navy-700">
                        {landlord.display_name}
                      </span>
                      {landlord.is_verified && <VerifiedBadge size="sm" />}
                    </div>
                    {landlord.city && (
                      <p className="text-[12px] text-slate-400">
                        {landlord.city}, {landlord.state_abbr}
                      </p>
                    )}
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-slate-400 transition-colors group-hover:text-navy-600" />
                </Link>
              </div>
            )}

            {openViolations > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Risk signals</p>
                <ul className="mt-3 space-y-2 text-[13px]">
                  <li className="flex items-center justify-between gap-3">
                    <span className="text-slate-700">Open violations</span>
                    <span className="font-display text-[16px] font-semibold tabular-nums text-red-600">
                      {openViolations.toLocaleString()}
                    </span>
                  </li>
                  <li className="flex items-center justify-between gap-3">
                    <span className="text-slate-700">Total records</span>
                    <span className="font-display text-[16px] font-semibold tabular-nums text-slate-900">
                      {recordList.length.toLocaleString()}
                    </span>
                  </li>
                </ul>
              </div>
            )}
          </aside>
        </div> {/* end main+sidebar grid */}
      </div>
    </div>
  )
}
