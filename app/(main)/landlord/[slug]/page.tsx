import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { MapPin, Globe, Phone, MessageSquare, Flag, Building2, GitCompare } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatAddress } from '@/lib/utils'
import { buildLandlordSummary } from '@/lib/summaries'
import type { Review, PublicRecord, Property } from '@/types'

interface LandlordPageProps {
  params: { slug: string }
}

export const revalidate = 3600 // ISR: revalidate every 1 hour

export async function generateMetadata({ params }: LandlordPageProps): Promise<Metadata> {
  const p = await params
  const supabase = await createClient()
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
  const supabase = await createClient()

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
      .select('*, reviewer:profiles(full_name, avatar_url), property:properties(address_line1, city, state_abbr), evidence:review_evidence(*)')
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

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="text-xs text-gray-400 mb-6 flex items-center gap-1.5">
          <Link href="/" className="hover:text-gray-700 transition-colors">Home</Link>
          <span className="text-gray-300">/</span>
          {landlord.city && (
            <>
              <Link href={`/city/${(landlord.state_abbr ?? '').toLowerCase()}/${(landlord.city ?? '').toLowerCase().replace(/\s+/g, '-')}`} className="hover:text-gray-700 transition-colors">
                {landlord.city}
              </Link>
              <span className="text-gray-300">/</span>
            </>
          )}
          <span className="text-gray-600">{landlord.display_name}</span>
        </nav>

        {/* Profile header — editorial, no box */}
        <div className="mb-8 pb-8 border-b border-gray-100">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <LandlordGrade grade={landlord.grade} size="md" />
                {landlord.is_verified && <VerifiedBadge />}
              </div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight mt-2">{landlord.display_name}</h1>
              {landlord.business_name && (
                <p className="text-gray-500 mt-1 text-sm">{landlord.business_name}</p>
              )}
              <div className="flex items-center flex-wrap gap-4 mt-3 text-sm text-gray-400">
                {(landlord.city || landlord.state_abbr) && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {[landlord.city, landlord.state_abbr, landlord.zip].filter(Boolean).join(', ')}
                  </span>
                )}
                {landlord.website && (
                  <a href={landlord.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-teal-600 transition-colors">
                    <Globe className="h-3.5 w-3.5" /> Website
                  </a>
                )}
                {landlord.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" /> {landlord.phone}
                  </span>
                )}
              </div>
              {landlordSummary && (
                <p className="mt-4 text-sm text-gray-500 leading-relaxed max-w-2xl">{landlordSummary}</p>
              )}
            </div>

            {/* Rating + actions */}
            <div className="flex flex-col items-end gap-4">
              {landlord.avg_rating > 0 && (
                <div className="text-right">
                  <div className="text-4xl font-black text-gray-900 tabular-nums">{landlord.avg_rating.toFixed(1)}</div>
                  <StarRating value={landlord.avg_rating} readonly size="sm" />
                  <p className="text-xs text-gray-400 mt-1">{landlord.review_count} {landlord.review_count === 1 ? 'review' : 'reviews'}</p>
                </div>
              )}
              <div className="flex gap-2 flex-wrap justify-end">
                <WatchlistButton landlordId={landlord.id} />
                <ShareButton name={landlord.display_name} />
                <Button asChild variant="outline" size="sm" className="text-gray-600 border-gray-200 rounded-full">
                  <Link href={`/compare?a=${landlord.slug}`}>
                    <GitCompare className="h-3.5 w-3.5 mr-1" /> Compare
                  </Link>
                </Button>
                {!landlord.is_claimed && (
                  <Button asChild size="sm" className="bg-teal-600 hover:bg-teal-700 text-white rounded-full">
                    <Link href={`/landlord-portal/claim?landlord=${landlord.id}`}>
                      Claim Profile
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Bio */}
          {landlord.bio && (
            <p className="mt-4 text-sm text-gray-700 leading-relaxed max-w-2xl border-l-2 border-teal-300 pl-4">{landlord.bio}</p>
          )}

          {/* Rating breakdown */}
          {(avgResponsiveness || avgMaintenance || avgHonesty || avgLeaseFairness) && (
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-3 max-w-lg">
              <RatingBar label="Responsiveness" value={avgResponsiveness} />
              <RatingBar label="Maintenance" value={avgMaintenance} />
              <RatingBar label="Honesty" value={avgHonesty} />
              <RatingBar label="Lease Fairness" value={avgLeaseFairness} />
              {wouldRentAgainPct !== null && approved.length > 0 && (
                <p className="text-xs text-gray-500 col-span-2 sm:col-span-4 mt-1">
                  <span className={`font-semibold ${wouldRentAgainPct >= 60 ? 'text-teal-600' : 'text-red-600'}`}>
                    {wouldRentAgainPct}%
                  </span>{' '}
                  would rent again
                </p>
              )}
            </div>
          )}
        </div>

        {/* Violation warning — inline, not a box */}
        {landlord.open_violation_count > 0 && (
          <div className="flex items-start gap-3 mb-6 p-4 bg-red-50 rounded-2xl">
            <Flag className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-800">
              <span className="font-semibold">{landlord.open_violation_count} open violation{landlord.open_violation_count !== 1 ? 's' : ''}</span>
              {' '}— {landlord.total_violation_count} total public records on file
              {landlord.eviction_count > 0 && `, including ${landlord.eviction_count} eviction filing${landlord.eviction_count !== 1 ? 's' : ''}`}.
            </p>
          </div>
        )}

        {/* Tabs — clean underline style */}
        <Tabs defaultValue="reviews">
          <TabsList className="w-full mb-6 bg-transparent border-b border-gray-200 rounded-none h-auto p-0 gap-0">
            <TabsTrigger
              value="reviews"
              className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-teal-500 data-[state=active]:text-teal-700 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors bg-transparent shadow-none"
            >
              <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
              Reviews ({landlord.review_count})
            </TabsTrigger>
            <TabsTrigger
              value="records"
              className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-teal-500 data-[state=active]:text-teal-700 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors bg-transparent shadow-none"
            >
              <Flag className="h-3.5 w-3.5 mr-1.5" />
              Public Records ({(records ?? []).length})
            </TabsTrigger>
            <TabsTrigger
              value="properties"
              className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-teal-500 data-[state=active]:text-teal-700 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors bg-transparent shadow-none"
            >
              <Building2 className="h-3.5 w-3.5 mr-1.5" />
              Properties ({(properties ?? []).length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reviews">
            <ReviewsList
              reviews={(reviews as Review[]) ?? []}
              landlordId={landlord.id}
              landlordSlug={landlord.slug}
            />
          </TabsContent>

          <TabsContent value="records">
            {(records ?? []).length >= 3 && (
              <div className="mb-6">
                <ViolationChart records={(records ?? []) as PublicRecord[]} />
              </div>
            )}
            <PublicRecordsPanel
              records={landlordRecords as PublicRecord[]}
              landlordName={landlord.display_name}
              isUnclaimed={!landlord.is_claimed}
            />
          </TabsContent>

          <TabsContent value="properties">
            {(properties ?? []).length === 0 ? (
              <div className="py-16 text-center text-gray-400 text-sm">No properties on record</div>
            ) : (
              <div>
                {(properties as Property[]).map(prop => (
                  <Link key={prop.id} href={`/property/${prop.id}`}
                    className="group flex items-center justify-between py-4 border-b border-gray-100 hover:border-gray-200 transition-colors">
                    <div>
                      <p className="font-medium text-gray-900 text-sm group-hover:text-teal-700 transition-colors">
                        {formatAddress(prop.address_line1, prop.city, prop.state_abbr, prop.zip ?? undefined)}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {prop.property_type}{prop.unit_count ? ` · ${prop.unit_count} units` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {prop.review_count > 0 && <StarRating value={prop.avg_rating} readonly size="sm" />}
                      <span className="text-gray-300 group-hover:text-teal-400 transition-colors">→</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}
