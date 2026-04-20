import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import {
  AlertTriangle,
  Building2,
  MapPin,
  Hash,
  Calendar,
  ChevronRight,
  MessageSquare,
  ExternalLink,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PublicRecordsPanel } from '@/components/landlord/PublicRecordsPanel'
import { ReviewCard } from '@/components/review/ReviewCard'
import { StarRating } from '@/components/review/StarRating'
import { VerifiedBadge } from '@/components/landlord/VerifiedBadge'
import { Button } from '@/components/ui/button'
import { formatAddress } from '@/lib/utils'
import { buildPropertySummary } from '@/lib/summaries'
import type { Review, PublicRecord } from '@/types'

interface PropertyPageProps {
  params: { id: string }
}

export const revalidate = 3600

export async function generateMetadata({ params }: PropertyPageProps): Promise<Metadata> {
  const p = await params
  const supabase = await createClient()
  const { data: prop } = await supabase.from('properties').select('*').eq('id', p.id).single()
  if (!prop) return { title: 'Property Not Found' }
  return {
    title: `${prop.address_line1}, ${prop.city} Reviews | Vett`,
    description: `Renter reviews and violation history for ${prop.address_line1}, ${prop.city}. ${prop.review_count} reviews.`,
  }
}

export default async function PropertyPage({ params }: PropertyPageProps) {
  const p = await params
  const supabase = await createClient()

  const { data: property } = await supabase
    .from('properties')
    .select('*, landlord:landlords(*)')
    .eq('id', p.id)
    .single()
  if (!property) notFound()

  const [{ data: reviews }, { data: records }] = await Promise.all([
    supabase
      .from('reviews')
      .select('*, reviewer:profiles(full_name, avatar_url)')
      .eq('property_id', property.id)
      .eq('status', 'approved')
      .order('created_at', { ascending: false }),
    supabase
      .from('public_records')
      .select('*')
      .eq('property_id', property.id)
      .order('filed_date', { ascending: false }),
  ])

  const landlord = property.landlord as any
  const isUnclaimed = !landlord?.is_claimed
  const openViolations = (records ?? []).filter(
    (r: PublicRecord) =>
      r.status?.toLowerCase() !== 'closed' && r.status?.toLowerCase() !== 'dismissed'
  ).length

  const reviewList = (reviews ?? []) as Review[]
  const recordList = (records ?? []) as PublicRecord[]
  const propertySummary = buildPropertySummary({
    property,
    landlordName: landlord?.display_name ?? null,
    records: recordList,
  })

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-xs text-gray-500 mb-6">
        <Link href="/" className="hover:text-navy-700 hover:underline transition-colors">
          Home
        </Link>
        <ChevronRight className="h-3 w-3 text-gray-300" />
        {property.city && (
          <>
            <Link
              href={`/city/${property.state_abbr.toLowerCase()}/${property.city
                .toLowerCase()
                .replace(/\s+/g, '-')}`}
              className="hover:text-navy-700 hover:underline transition-colors"
            >
              {property.city}, {property.state_abbr}
            </Link>
            <ChevronRight className="h-3 w-3 text-gray-300" />
          </>
        )}
        <span className="text-gray-700 font-medium">{property.address_line1}</span>
      </nav>

      {/* ── Property Header — editorial ── */}
      <div className="mb-8 pb-8 border-b border-gray-100">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-black text-gray-900 tracking-tight leading-tight">
              {property.address_line1}
            </h1>
            <p className="flex items-center gap-1.5 text-sm text-gray-400 mt-2">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
              {property.city}, {property.state_abbr} {property.zip}
            </p>

            {/* Meta chips */}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {property.property_type && (
                <span className="inline-flex items-center gap-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full px-3 py-1 capitalize">
                  <Building2 className="h-3 w-3" />
                  {property.property_type}
                </span>
              )}
              {property.unit_count && (
                <span className="inline-flex items-center gap-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full px-3 py-1">
                  <Hash className="h-3 w-3" />
                  {property.unit_count} units
                </span>
              )}
              {property.year_built && (
                <span className="inline-flex items-center gap-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full px-3 py-1">
                  <Calendar className="h-3 w-3" />
                  Built {property.year_built}
                </span>
              )}
            </div>

            {propertySummary && (
              <p className="mt-4 text-sm text-gray-500 leading-relaxed max-w-2xl">{propertySummary}</p>
            )}

            {/* Managed by */}
            {landlord ? (
              <div className="mt-4 flex items-center gap-2">
                <span className="text-xs text-gray-400">Managed by</span>
                <Link
                  href={`/landlord/${landlord.slug}`}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700 hover:text-teal-800 transition-colors group"
                >
                  {landlord.display_name}
                  {landlord.is_verified && <VerifiedBadge size="sm" />}
                  <ExternalLink className="h-3 w-3 text-gray-400 group-hover:text-teal-600" />
                </Link>
              </div>
            ) : (
              <div className="mt-4 flex items-center gap-2 text-sm text-amber-700">
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                <span>No landlord on record for this property</span>
              </div>
            )}
          </div>

          {/* Rating */}
          {property.review_count > 0 && (
            <div className="text-right flex-shrink-0">
              <div className="text-4xl font-black text-gray-900 tabular-nums">{property.avg_rating.toFixed(1)}</div>
              <StarRating value={property.avg_rating} readonly size="sm" />
              <p className="text-xs text-gray-400 mt-1">{property.review_count} review{property.review_count !== 1 ? 's' : ''}</p>
            </div>
          )}
        </div>

        {/* Open violations banner */}
        {openViolations > 0 && (
          <div className="flex items-start gap-3 mt-6 p-4 bg-red-50 rounded-2xl">
            <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-800">
              <span className="font-semibold">{openViolations} open violation{openViolations !== 1 ? 's' : ''}</span>
              {' '}on record for this property.
            </p>
          </div>
        )}
      </div>

      {/* ── Public Records ── */}
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

      {/* ── Reviews ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-navy-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Renter Reviews{reviewList.length > 0 && ` (${reviewList.length})`}
            </h2>
          </div>
          <Button asChild size="sm" className="bg-teal-600 hover:bg-teal-700 text-white rounded-lg">
            <Link href={`/review/new?property=${property.id}`}>Write a Review</Link>
          </Button>
        </div>

        {reviewList.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
            <div className="h-14 w-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="h-7 w-7 text-gray-400" />
            </div>
            <p className="text-base font-semibold text-gray-700">No reviews yet</p>
            <p className="text-sm text-gray-400 mt-1 max-w-xs mx-auto">
              Be the first to share your experience living at this property and help future renters.
            </p>
            <Button
              asChild
              size="sm"
              className="mt-5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg"
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

      {/* ── Report Issue ── */}
      <div className="mt-10 pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-gray-700">See something wrong?</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Report inaccurate information, missing records, or a safety concern.
          </p>
        </div>
        <Button
          asChild
          variant="outline"
          size="sm"
          className="flex-shrink-0 border-gray-200 hover:border-red-200 hover:text-red-600 rounded-full"
        >
          <Link href="/contact">Report an Issue</Link>
        </Button>
      </div>
    </div>
  )
}
