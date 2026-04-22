import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { MapPin, Globe, Phone, MessageSquare, Flag, Building2, GitCompare } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/server'
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

  // Also fetch records linked through this landlord's properties
  const propertyIds = (properties ?? []).map((p: Property) => p.id)
  let propertyRecords: PublicRecord[] = []
  if (propertyIds.length > 0) {
    const { data: propRecs } = await supabase
      .from('public_records')
      .select('*')
      .in('property_id', propertyIds)
      .is('landlord_id', null)
      .order('filed_date', { ascending: false })
    propertyRecords = (propRecs ?? []) as PublicRecord[]
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

  // Merge direct records + property-linked records (deduplicate by id)
  const seenRecordIds = new Set<string>()
  const landlordRecords: PublicRecord[] = []
  for (const r of [...(directRecords ?? []) as PublicRecord[], ...propertyRecords]) {
    if (!seenRecordIds.has(r.id)) {
      seenRecordIds.add(r.id)
      landlordRecords.push(r)
    }
  }
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

      <div className="min-h-screen bg-[#F8FAFC]">
        <div className="mx-auto max-w-[1180px] px-8 py-7">
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

        {/* Header Card */}
        <div className="mb-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* Top accent rule */}
          <div className="h-[3px] bg-navy-500" />

          {/* Top row: identity + at-a-glance */}
          <div className="grid gap-6 px-6 py-7 sm:px-8 lg:grid-cols-[1fr_320px] lg:items-start">
            <div className="min-w-0 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-display text-[clamp(1.8rem,4vw,2.4rem)] leading-tight tracking-tight text-slate-900">
                  {landlord.display_name}
                </h1>
                {landlord.is_verified && <VerifiedBadge label="Verified landlord" />}
                <Grade letter={getGradeLetter(landlord.avg_rating)} size="md" />
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
              <div className="flex flex-wrap gap-2">
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
              </div>
            </div>

            {/* At a glance sidebar */}
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">At a glance</p>
              {landlord.avg_rating > 0 ? (
                <div className="mt-2">
                  <div className="text-[42px] font-extrabold leading-none tracking-[-0.03em]">{landlord.avg_rating.toFixed(1)}</div>
                  <div className="mt-1.5"><Stars value={landlord.avg_rating} size={14} /></div>
                  <p className="mt-1.5 text-[12px] text-slate-500">{landlord.review_count} verified reviews</p>
                </div>
              ) : (
                <div className="mt-2">
                  <div className="text-[42px] font-extrabold leading-none tracking-[-0.03em] text-slate-300">&mdash;</div>
                  <p className="mt-2 text-[12px] text-slate-500">No reviews yet</p>
                </div>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <WatchlistButton landlordId={landlord.id} />
                <ShareButton name={landlord.display_name} />
                <Button asChild variant="outline" size="sm" className="h-8 rounded-full border-slate-200 px-3 text-[12px] text-slate-700">
                  <Link href={`/compare?a=${landlord.slug}`}>Compare</Link>
                </Button>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-4 border-t border-slate-100 px-6 py-5 sm:grid-cols-4 sm:px-8">
            {[
              { label: 'Reviews', value: landlord.review_count, color: '' },
              { label: 'Properties', value: (properties ?? []).length, color: '' },
              { label: 'Public records', value: landlordRecords.length, color: 'text-amber-700' },
              { label: 'Open violations', value: landlord.open_violation_count ?? 0, color: 'text-red-600' },
            ].map(s => (
              <div key={s.label} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{s.label}</p>
                <p className={`mt-1 text-[22px] font-extrabold tracking-tight ${s.color || 'text-slate-900'}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Rating breakdown */}
          {(avgResponsiveness || avgMaintenance || avgHonesty || avgLeaseFairness) && (
            <div className="border-t border-slate-100 px-6 py-6 sm:px-8">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-[14px] font-bold text-slate-900">Rating breakdown</h3>
                {wouldRentAgainPct !== null && approved.length > 0 && (
                  <p className="text-[13px] text-slate-500">
                    <span className={`font-bold ${wouldRentAgainPct >= 50 ? 'text-amber-700' : 'text-red-600'}`}>
                      {wouldRentAgainPct}%
                    </span>{' '}
                    would rent again
                  </p>
                )}
              </div>
              <div className="grid max-w-[900px] gap-x-10 gap-y-3.5 sm:grid-cols-2">
                <RatingBar label="Responsiveness" value={avgResponsiveness} />
                <RatingBar label="Maintenance" value={avgMaintenance} />
                <RatingBar label="Honesty" value={avgHonesty} />
                <RatingBar label="Lease Fairness" value={avgLeaseFairness} />
              </div>
            </div>
          )}

          {/* Bio */}
          {landlord.bio && (
            <div className="border-t border-slate-100 px-6 py-5 sm:px-8">
              <p className="text-sm leading-6 text-slate-700">{landlord.bio}</p>
            </div>
          )}
        </div>

        {/* Violation banner */}
        {landlord.open_violation_count > 0 && (
          <div className="mb-5 flex items-start gap-3.5 rounded-xl border border-red-200 bg-gradient-to-r from-red-50 to-orange-50 px-5 py-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-red-200 bg-red-100">
              <Flag className="h-[18px] w-[18px] text-red-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[14.5px] font-bold text-red-900">
                {landlord.open_violation_count} open violation{landlord.open_violation_count !== 1 ? 's' : ''}
                {landlord.eviction_count > 0 && ` \u00b7 ${landlord.eviction_count} eviction filing${landlord.eviction_count !== 1 ? 's' : ''} on file`}
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-orange-800">
                Pulled from public government databases. Last synced recently.
              </p>
            </div>
          </div>
        )}

        <Tabs defaultValue="reviews">
          <TabsList className="mb-5 grid w-full grid-cols-3 gap-1 rounded-2xl bg-slate-100 p-1.5">
            <TabsTrigger value="reviews" className="rounded-xl py-3 text-[14px] font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <MessageSquare className="mr-2 h-3.5 w-3.5" />
              Reviews <span className="ml-1 text-slate-400">({landlord.review_count})</span>
            </TabsTrigger>
            <TabsTrigger value="records" className="rounded-xl py-3 text-[14px] font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Flag className="mr-2 h-3.5 w-3.5" />
              Public records <span className="ml-1 text-slate-400">({landlordRecords.length})</span>
            </TabsTrigger>
            <TabsTrigger value="properties" className="rounded-xl py-3 text-[14px] font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Building2 className="mr-2 h-3.5 w-3.5" />
              Properties <span className="ml-1 text-slate-400">({(properties ?? []).length})</span>
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
            {landlordRecords.length >= 3 && (
              <div className="mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <ViolationChart records={landlordRecords} />
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
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 py-12 text-center">
                <Building2 className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                <p className="text-sm font-medium text-slate-600">No properties linked yet</p>
                <p className="mt-1 text-xs text-slate-400">Properties get linked automatically as public records are synced from government databases.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {(properties as Property[]).map(prop => (
                  <Link key={prop.id} href={`/property/${prop.id}`} className="group block rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-[15px] font-bold text-slate-900 group-hover:text-navy-700">
                          {formatAddress(prop.address_line1, prop.city, prop.state_abbr, prop.zip ?? undefined)}
                        </p>
                        <p className="mt-1 text-[12.5px] text-slate-500">
                          {prop.property_type} {prop.unit_count ? `\u00b7 ${prop.unit_count} units` : ''}
                        </p>
                        {prop.review_count > 0 && (
                          <div className="mt-2.5 flex items-center gap-2.5">
                            <Stars value={prop.avg_rating} size={13} />
                            <span className="text-[13px] font-bold text-slate-900">{prop.avg_rating.toFixed(1)}</span>
                            <span className="text-[12px] text-slate-400">\u00b7 {prop.review_count} reviews</span>
                          </div>
                        )}
                      </div>
                      {((prop as any).open_violation_count ?? 0) > 0 && (
                        <span className="flex-shrink-0 inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-800">
                          <Flag className="h-2.5 w-2.5" /> {(prop as any).open_violation_count} open
                        </span>
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
