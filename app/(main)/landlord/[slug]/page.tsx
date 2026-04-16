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
    description: `Read ${landlord.review_count} verified renter reviews of ${landlord.display_name}. See public records, court cases, and violation history.`,
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

  const propertyRecords = (records ?? []).filter((r: PublicRecord) => !r.landlord_id && r.property_id)
  const landlordRecords = (records ?? []).filter((r: PublicRecord) => r.landlord_id === landlord.id)

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
        <nav className="text-xs text-gray-500 mb-4 flex items-center gap-1">
          <Link href="/" className="hover:underline">Home</Link>
          <span>›</span>
          {landlord.city && (
            <>
              <Link href={`/city/${(landlord.state_abbr ?? '').toLowerCase()}/${(landlord.city ?? '').toLowerCase().replace(/\s+/g, '-')}`} className="hover:underline">
                {landlord.city}
              </Link>
              <span>›</span>
            </>
          )}
          <span className="text-gray-700">{landlord.display_name}</span>
        </nav>

        {/* Header */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900">{landlord.display_name}</h1>
                {landlord.is_verified && <VerifiedBadge />}
                <LandlordGrade grade={landlord.grade} size="md" />
              </div>
              {landlord.business_name && (
                <p className="text-gray-500 mt-0.5">{landlord.business_name}</p>
              )}
              {(landlord.city || landlord.state_abbr) && (
                <div className="flex items-center gap-1.5 mt-2 text-gray-500">
                  <MapPin className="h-4 w-4" />
                  <span>{[landlord.city, landlord.state_abbr, landlord.zip].filter(Boolean).join(', ')}</span>
                </div>
              )}
              <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-500">
                {landlord.website && (
                  <a href={landlord.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-navy-600">
                    <Globe className="h-3.5 w-3.5" /> Website
                  </a>
                )}
                {landlord.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" /> {landlord.phone}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              {landlord.avg_rating > 0 && (
                <div className="text-right">
                  <div className="text-3xl font-bold text-gray-900">{landlord.avg_rating.toFixed(1)}</div>
                  <StarRating value={landlord.avg_rating} readonly size="sm" />
                  <p className="text-xs text-gray-500 mt-0.5">{landlord.review_count} {landlord.review_count === 1 ? 'review' : 'reviews'}</p>
                </div>
              )}
              <div className="flex gap-2 flex-wrap justify-end">
                <WatchlistButton landlordId={landlord.id} />
                <ShareButton name={landlord.display_name} />
                <Button asChild variant="outline" size="sm" className="text-gray-600 border-gray-200">
                  <Link href={`/compare?a=${landlord.slug}`}>
                    <GitCompare className="h-3.5 w-3.5 mr-1" /> Compare
                  </Link>
                </Button>
                {!landlord.is_claimed && (
                  <Button asChild variant="outline" size="sm" className="text-navy-700 border-navy-200">
                    <Link href={`/landlord-portal/claim?landlord=${landlord.id}`}>
                      Claim Profile
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Bio (if claimed + verified) */}
          {landlord.bio && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-700 leading-relaxed">{landlord.bio}</p>
            </div>
          )}

          {/* Rating breakdown */}
          {(avgResponsiveness || avgMaintenance || avgHonesty || avgLeaseFairness) && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Rating Breakdown</h3>
              <div className="space-y-2 max-w-sm">
                <RatingBar label="Responsiveness" value={avgResponsiveness} />
                <RatingBar label="Maintenance" value={avgMaintenance} />
                <RatingBar label="Honesty" value={avgHonesty} />
                <RatingBar label="Lease Fairness" value={avgLeaseFairness} />
              </div>
              {wouldRentAgainPct !== null && approved.length > 0 && (
                <p className="text-sm text-gray-600 mt-3">
                  <span className={`font-semibold ${wouldRentAgainPct >= 60 ? 'text-teal-600' : 'text-red-600'}`}>
                    {wouldRentAgainPct}%
                  </span>{' '}
                  would rent again ({approved.length} responses)
                </p>
              )}
            </div>
          )}
        </div>

        {/* Violation summary banner */}
        {landlord.open_violation_count > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center gap-3">
            <div className="flex-shrink-0 h-10 w-10 bg-red-100 rounded-lg flex items-center justify-center">
              <Flag className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="font-semibold text-red-900">
                {landlord.open_violation_count} open violation{landlord.open_violation_count !== 1 ? 's' : ''}
              </p>
              <p className="text-sm text-red-700">
                This landlord has {landlord.total_violation_count} total public records on file
                {landlord.eviction_count > 0 && `, including ${landlord.eviction_count} eviction filing${landlord.eviction_count !== 1 ? 's' : ''}`}.
              </p>
            </div>
          </div>
        )}

        <Tabs defaultValue="reviews">
          <TabsList className="w-full mb-6 bg-gray-100">
            <TabsTrigger value="reviews" className="flex-1">
              <MessageSquare className="h-4 w-4 mr-1.5" />
              Reviews ({landlord.review_count})
            </TabsTrigger>
            <TabsTrigger value="records" className="flex-1">
              <Flag className="h-4 w-4 mr-1.5" />
              Public Records ({(records ?? []).length})
            </TabsTrigger>
            <TabsTrigger value="properties" className="flex-1">
              <Building2 className="h-4 w-4 mr-1.5" />
              Properties ({(properties ?? []).length})
            </TabsTrigger>
          </TabsList>

          {/* Reviews tab */}
          <TabsContent value="reviews">
            <ReviewsList
              reviews={(reviews as Review[]) ?? []}
              landlordId={landlord.id}
              landlordSlug={landlord.slug}
            />
          </TabsContent>

          {/* Public records tab */}
          <TabsContent value="records">
            {(records ?? []).length >= 3 && (
              <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
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
              <div className="text-center py-10 text-gray-500 text-sm">No properties on record</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(properties as Property[]).map(prop => (
                  <Link key={prop.id} href={`/property/${prop.id}`} className="block bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          {formatAddress(prop.address_line1, prop.city, prop.state_abbr, prop.zip ?? undefined)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
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
    </>
  )
}
