import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { MapPin, Globe, Phone, MessageSquare, Flag, Building2, GitCompare } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/server'
import { PublicRecordsPanel } from '@/components/landlord/PublicRecordsPanel'
import { ViolationChart } from '@/components/landlord/ViolationChart'
import { VerifiedBadge } from '@/components/landlord/VerifiedBadge'
import { LandlordGrade } from '@/components/landlord/LandlordGrade'
import { RatingBar } from '@/components/landlord/RatingBar'
import { ReviewsList } from '@/components/review/ReviewsList'
import { WatchlistButton } from '@/components/landlord/WatchlistButton'
import { ShareButton } from '@/components/landlord/ShareButton'
import { StarRating } from '@/components/review/StarRating'
import { Button } from '@/components/ui/button'
import { cityPagePath, getCanonicalCity } from '@/lib/cities'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PUBLIC_REVIEW_SELECT } from '@/lib/reviews/public'
import { formatAddress } from '@/lib/utils'
import { buildLandlordSummary } from '@/lib/summaries'
import type { Review, PublicRecord, Property } from '@/types'

interface LandlordPageProps {
  params: { slug: string }
}

export const revalidate = 3600 // ISR: revalidate every 1 hour

export async function generateMetadata({ params }: LandlordPageProps): Promise<Metadata> {
  const p = await params
  const supabase = createServiceClient()
  const { data: landlord } = await supabase
    .from('landlords')
    .select('display_name, city, state_abbr, avg_rating, review_count')
    .eq('slug', p.slug)
    .single()
  if (!landlord) return { title: 'Landlord Not Found' }

  const location = [landlord.city, landlord.state_abbr].filter(Boolean).join(', ')
  return {
    title: `${landlord.display_name} Reviews${location ? ` — ${location}` : ''}`,
    description: `Read ${landlord.review_count} lease-verified renter reviews of ${landlord.display_name}. See public records, court cases, and violation history.`,
    openGraph: {
      title: `${landlord.display_name} Reviews | Vett`,
      description: `${landlord.review_count} renter reviews · ${landlord.avg_rating.toFixed(1)} avg rating`,
    },
  }
}

export default async function LandlordPage({ params }: LandlordPageProps) {
  const p = await params
  const supabase = createServiceClient()

  // Fetch landlord
  const { data: landlord } = await supabase
    .from('landlords')
    .select('*')
    .eq('slug', p.slug)
    .single()
  if (!landlord) notFound()

  // Fetch all data in parallel
  const [
    { data: reviews },
    { data: records },
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
      .select('*')
      .eq('landlord_id', landlord.id)
      .order('filed_date', { ascending: false }),
    supabase
      .from('properties')
      .select('*')
      .eq('landlord_id', landlord.id)
      .order('review_count', { ascending: false }),
    supabase
      .from('reviews')
      .select('rating_responsiveness, rating_maintenance, rating_honesty, rating_lease_fairness, would_rent_again')
      .eq('landlord_id', landlord.id)
      .eq('status', 'approved'),
  ])

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

  const landlordRecords = (records ?? []).filter((r: PublicRecord) => r.landlord_id === landlord.id)
  const landlordSummary = buildLandlordSummary({
    landlord,
    propertyCount: (properties ?? []).length,
  })

  // JSON-LD structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: landlord.display_name,
    ...(landlord.business_name && { legalName: landlord.business_name }),
    ...(landlord.city && { address: { '@type': 'PostalAddress', addressLocality: landlord.city, addressRegion: landlord.state_abbr, postalCode: landlord.zip ?? undefined } }),
    ...(landlord.avg_rating > 0 && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: landlord.avg_rating,
        reviewCount: landlord.review_count,
        bestRating: 5,
        worstRating: 1,
      },
    }),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-5xl px-4 py-8">
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

        {/* Header */}
        <div className="mb-6 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="h-1.5 bg-gradient-to-r from-navy-600 via-sky-500 to-teal-500" />
          <div className="grid gap-6 px-5 py-6 sm:px-7 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
            <div className="min-w-0 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{landlord.display_name}</h1>
                {landlord.is_verified && <VerifiedBadge />}
                <LandlordGrade grade={landlord.grade} size="md" />
              </div>
              {landlord.business_name && (
                <p className="text-sm text-slate-500">{landlord.business_name}</p>
              )}
              {(landlord.city || landlord.state_abbr) && (
                <div className="flex items-center gap-1.5 text-sm text-slate-500">
                  <MapPin className="h-4 w-4 flex-shrink-0" />
                  <span>{[landlord.city, landlord.state_abbr, landlord.zip].filter(Boolean).join(', ')}</span>
                </div>
              )}
              <div className="flex flex-wrap gap-3 text-sm text-slate-500">
                {landlord.website && (
                  <a href={landlord.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 transition-colors hover:border-navy-200 hover:text-navy-700">
                    <Globe className="h-3.5 w-3.5" /> Website
                  </a>
                )}
                {landlord.phone && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
                    <Phone className="h-3.5 w-3.5" /> {landlord.phone}
                  </span>
                )}
              </div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between lg:flex-col lg:items-stretch">
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">At a glance</p>
                  {landlord.avg_rating > 0 ? (
                    <div className="mt-2">
                      <div className="text-4xl font-semibold tracking-tight text-slate-950">{landlord.avg_rating.toFixed(1)}</div>
                      <div className="mt-1">
                        <StarRating value={landlord.avg_rating} readonly size="sm" />
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{landlord.review_count} {landlord.review_count === 1 ? 'review' : 'reviews'}</p>
                    </div>
                  ) : (
                    <div className="mt-2">
                      <div className="text-4xl font-semibold tracking-tight text-slate-950">—</div>
                      <p className="mt-1 text-xs text-slate-500">No reviews yet</p>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <WatchlistButton landlordId={landlord.id} />
                  <ShareButton name={landlord.display_name} />
                  <Button asChild variant="outline" size="sm" className="rounded-full border-slate-200 text-slate-700">
                    <Link href={`/compare?a=${landlord.slug}`}>
                      <GitCompare className="mr-1 h-3.5 w-3.5" /> Compare
                    </Link>
                  </Button>
                  {!landlord.is_claimed && (
                    <Button asChild variant="outline" size="sm" className="rounded-full border-navy-200 text-navy-700">
                      <Link href={`/landlord-portal/claim?landlord=${landlord.id}`}>
                        Claim Profile
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 px-5 py-5 sm:px-7">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Summary</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{landlordSummary}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Reviews</p>
                  <p className="mt-1 text-xl font-semibold text-slate-950">{landlord.review_count}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Properties</p>
                  <p className="mt-1 text-xl font-semibold text-slate-950">{(properties ?? []).length}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Public records</p>
                  <p className="mt-1 text-xl font-semibold text-slate-950">{(records ?? []).length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bio (if claimed + verified) */}
          {landlord.bio && (
            <div className="border-t border-slate-100 px-5 py-5 sm:px-7">
              <p className="text-sm leading-6 text-slate-700">{landlord.bio}</p>
            </div>
          )}

          {/* Rating breakdown */}
          {(avgResponsiveness || avgMaintenance || avgHonesty || avgLeaseFairness) && (
            <div className="border-t border-slate-100 px-5 py-5 sm:px-7">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-slate-900">Rating breakdown</h3>
                {wouldRentAgainPct !== null && approved.length > 0 && (
                  <p className="text-sm text-slate-500">
                    <span className={`font-semibold ${wouldRentAgainPct >= 60 ? 'text-teal-600' : 'text-red-600'}`}>
                      {wouldRentAgainPct}%
                    </span>{' '}
                    would rent again
                  </p>
                )}
              </div>
              <div className="mt-3 grid gap-2.5 sm:max-w-lg">
                <RatingBar label="Responsiveness" value={avgResponsiveness} />
                <RatingBar label="Maintenance" value={avgMaintenance} />
                <RatingBar label="Honesty" value={avgHonesty} />
                <RatingBar label="Lease Fairness" value={avgLeaseFairness} />
              </div>
              {wouldRentAgainPct !== null && approved.length > 0 && (
                <p className="mt-3 text-sm text-slate-500">
                  Based on {approved.length} verified responses.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Violation summary banner */}
        {landlord.open_violation_count > 0 && (
          <div className="mb-6 overflow-hidden rounded-2xl border border-red-200 bg-red-50 shadow-sm">
            <div className="flex items-start gap-3 px-5 py-4">
              <div className="flex-shrink-0 rounded-xl bg-red-100 p-2.5">
                <Flag className="h-5 w-5 text-red-600" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-red-900">
                  {landlord.open_violation_count} open violation{landlord.open_violation_count !== 1 ? 's' : ''}
                </p>
                <p className="text-sm leading-6 text-red-700">
                  This landlord has {landlord.total_violation_count} total public records on file
                  {landlord.eviction_count > 0 && `, including ${landlord.eviction_count} eviction filing${landlord.eviction_count !== 1 ? 's' : ''}`}.
                </p>
              </div>
            </div>
          </div>
        )}

        <Tabs defaultValue="reviews">
          <TabsList className="mb-6 grid w-full grid-cols-1 gap-2 rounded-2xl bg-slate-100 p-1 sm:grid-cols-3">
            <TabsTrigger value="reviews" className="rounded-xl py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <MessageSquare className="mr-1.5 h-4 w-4" />
              Reviews ({landlord.review_count})
            </TabsTrigger>
            <TabsTrigger value="records" className="rounded-xl py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Flag className="mr-1.5 h-4 w-4" />
              Public Records ({(records ?? []).length})
            </TabsTrigger>
            <TabsTrigger value="properties" className="rounded-xl py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Building2 className="mr-1.5 h-4 w-4" />
              Properties ({(properties ?? []).length})
            </TabsTrigger>
          </TabsList>

          {/* Reviews tab */}
          <TabsContent value="reviews">
            <ReviewsList
              reviews={(reviews as unknown as Review[]) ?? []}
              landlordId={landlord.id}
              landlordSlug={landlord.slug}
            />
          </TabsContent>

          {/* Public records tab */}
          <TabsContent value="records">
            {(records ?? []).length >= 3 && (
              <div className="mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <ViolationChart records={(records ?? []) as PublicRecord[]} />
              </div>
            )}
            <PublicRecordsPanel
              records={landlordRecords as PublicRecord[]}
              landlordName={landlord.display_name}
              isUnclaimed={!landlord.is_claimed}
            />
          </TabsContent>

          {/* Properties tab */}
          <TabsContent value="properties">
            {(properties ?? []).length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-12 text-center text-sm text-slate-500">
                No properties on record
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {(properties as Property[]).map(prop => (
                  <Link key={prop.id} href={`/property/${prop.id}`} className="group block overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-navy-200 hover:shadow-md">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold leading-6 text-slate-900 group-hover:text-navy-700">
                          {formatAddress(prop.address_line1, prop.city, prop.state_abbr, prop.zip ?? undefined)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {prop.property_type} {prop.unit_count ? `· ${prop.unit_count} units` : ''}
                        </p>
                      </div>
                      {prop.review_count > 0 && (
                        <StarRating value={prop.avg_rating} readonly size="sm" />
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
        </div>
      </div>
    </>
  )
}
