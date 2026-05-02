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
import { PUBLIC_REVIEW_SELECT } from '@/lib/reviews/public'
import { formatAddress } from '@/lib/utils'
import { buildPropertySummary } from '@/lib/summaries'
import { cityPagePath, getCanonicalCity } from '@/lib/cities'
import type { Review, PublicRecord } from '@/types'

interface PropertyPageProps {
  params: { id: string }
}

export const revalidate = 3600

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
  if (!prop) return { title: 'Property Not Found' }
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

  const landlord = property.landlord as any
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
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://vettrentals.com'
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
      <div className="mx-auto max-w-4xl px-4 py-8">
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

        <div className="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="h-1.5 bg-gradient-to-r from-navy-600 via-sky-500 to-teal-500" />
          <div className="grid gap-6 px-5 py-6 sm:px-7 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
            <div className="min-w-0 space-y-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-navy-50 text-navy-600 ring-1 ring-navy-100">
                  <Building2 className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                    {property.address_line1}
                  </h1>
                  <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                    <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                    {property.city}, {property.state_abbr} {property.zip}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {property.property_type && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-navy-200 bg-navy-50 px-3 py-1.5 text-xs font-medium text-navy-700 capitalize">
                    <Building2 className="h-3 w-3" />
                    {property.property_type}
                  </span>
                )}
                {property.unit_count && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600">
                    <Hash className="h-3 w-3" />
                    {property.unit_count} units
                  </span>
                )}
                {property.year_built && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600">
                    <Calendar className="h-3 w-3" />
                    Built {property.year_built}
                  </span>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Summary
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{propertySummary}</p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="space-y-4">
                {property.review_count > 0 ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                      Rating
                    </p>
                    <div className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">
                      {property.avg_rating.toFixed(1)}
                    </div>
                    <div className="mt-1">
                      <StarRating value={property.avg_rating} readonly size="sm" />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {property.review_count} review{property.review_count !== 1 ? 's' : ''}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                      Rating
                    </p>
                    <p className="mt-2 text-sm text-slate-500">No reviews yet</p>
                  </div>
                )}

                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Managed by
                  </p>
                  {landlord ? (
                    <Link
                      href={`/landlord/${landlord.slug}`}
                      className="group mt-2 inline-flex items-center gap-2"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-50 text-navy-600 ring-1 ring-navy-100">
                        <User className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold text-slate-900 group-hover:text-navy-700">
                            {landlord.display_name}
                          </span>
                          {landlord.is_verified && <VerifiedBadge size="sm" />}
                        </div>
                        {landlord.city && (
                          <p className="text-xs text-slate-400">
                            {landlord.city}, {landlord.state_abbr}
                          </p>
                        )}
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 text-slate-400 transition-colors group-hover:text-navy-600" />
                    </Link>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500">No landlord on record</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {openViolations > 0 && (
            <div className="border-t border-slate-100 px-5 py-5 sm:px-7">
              <div className="flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600" />
                <div>
                  <p className="text-sm font-semibold text-red-700">
                    {openViolations} open violation{openViolations !== 1 ? 's' : ''}
                  </p>
                  <p className="mt-0.5 text-xs text-red-600">
                    This property has unresolved housing code violations on record. Review the
                    public records below for details.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

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
      </div>
    </div>
  )
}
