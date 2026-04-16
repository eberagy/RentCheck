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
  User,
  ExternalLink,
  Phone,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PublicRecordsPanel } from '@/components/landlord/PublicRecordsPanel'
import { ReviewCard } from '@/components/review/ReviewCard'
import { StarRating } from '@/components/review/StarRating'
import { VerifiedBadge } from '@/components/landlord/VerifiedBadge'
import { Button } from '@/components/ui/button'
import { formatAddress } from '@/lib/utils'
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

      {/* ── Property Header Card ── */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden mb-6 shadow-sm">
        {/* Top accent bar */}
        <div className="h-1.5 bg-gradient-to-r from-navy-600 to-teal-500" />

        <div className="p-6">
          {/* Title row */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="h-11 w-11 rounded-xl bg-navy-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Building2 className="h-6 w-6 text-navy-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 leading-tight">
                  {property.address_line1}
                </h1>
                <p className="flex items-center gap-1 text-sm text-gray-500 mt-0.5">
                  <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                  {property.city}, {property.state_abbr} {property.zip}
                </p>
              </div>
            </div>

            {/* Rating bubble */}
            {property.review_count > 0 && (
              <div className="flex flex-col items-center sm:items-end gap-0.5 flex-shrink-0 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                <span className="text-3xl font-extrabold text-gray-900 leading-none">
                  {property.avg_rating.toFixed(1)}
                </span>
                <StarRating value={property.avg_rating} readonly size="sm" />
                <p className="text-xs text-gray-500">
                  {property.review_count} review{property.review_count !== 1 ? 's' : ''}
                </p>
              </div>
            )}
          </div>

          {/* Property meta chips */}
          <div className="flex flex-wrap items-center gap-2 mt-4">
            {property.property_type && (
              <span className="inline-flex items-center gap-1 text-xs font-medium bg-navy-50 text-navy-700 border border-navy-200 rounded-full px-3 py-1 capitalize">
                <Building2 className="h-3 w-3" />
                {property.property_type}
              </span>
            )}
            {property.unit_count && (
              <span className="inline-flex items-center gap-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full px-3 py-1">
                <Hash className="h-3 w-3" />
                {property.unit_count} units
              </span>
            )}
            {property.year_built && (
              <span className="inline-flex items-center gap-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full px-3 py-1">
                <Calendar className="h-3 w-3" />
                Built {property.year_built}
              </span>
            )}
          </div>

          {/* Open violations banner */}
          {openViolations > 0 && (
            <div className="mt-4 flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-700">
                  {openViolations} Open Violation{openViolations !== 1 ? 's' : ''}
                </p>
                <p className="text-xs text-red-600 mt-0.5">
                  This property has unresolved housing code violations on record. Review the public
                  records below for details.
                </p>
              </div>
            </div>
          )}

          {/* Managed by section */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Managed by
            </p>
            {landlord ? (
              <Link
                href={`/landlord/${landlord.slug}`}
                className="inline-flex items-center gap-2 group"
              >
                <div className="h-8 w-8 rounded-full bg-navy-100 flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-navy-600" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-navy-700 group-hover:text-navy-900 group-hover:underline transition-colors">
                    {landlord.display_name}
                  </span>
                  {landlord.is_verified && (
                    <span className="ml-1.5 inline-block">
                      <VerifiedBadge size="sm" />
                    </span>
                  )}
                  {landlord.city && (
                    <p className="text-xs text-gray-400">
                      {landlord.city}, {landlord.state_abbr}
                    </p>
                  )}
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-gray-400 group-hover:text-navy-600 ml-1 transition-colors" />
              </Link>
            ) : (
              <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">No landlord on record</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    No landlord has claimed this property. Public records are linked to this address
                    only.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
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
          <Button asChild size="sm" className="bg-navy-600 hover:bg-navy-700 text-white rounded-lg">
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
              className="mt-5 bg-navy-600 hover:bg-navy-700 text-white rounded-lg"
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
      <div className="mt-10 bg-gray-50 border border-gray-200 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
            <Phone className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">See something wrong?</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Report inaccurate information, missing records, or a safety concern about this
              property.
            </p>
          </div>
        </div>
        <Button
          asChild
          variant="outline"
          size="sm"
          className="flex-shrink-0 border-gray-300 hover:border-red-300 hover:text-red-700 rounded-lg"
        >
          <Link href="/contact">Report an Issue</Link>
        </Button>
      </div>
    </div>
  )
}
