import Link from 'next/link'
import { MapPin, MessageSquare, AlertTriangle, Gavel, ArrowRight } from 'lucide-react'
import { VerifiedBadge } from './VerifiedBadge'
import { LandlordGrade } from './LandlordGrade'
import { StarRating } from '@/components/review/StarRating'
import { cn } from '@/lib/utils'
import { buildLandlordSummary, truncateSummary } from '@/lib/summaries'
import type { Landlord } from '@/types'

interface LandlordCardProps {
  landlord: Landlord
  className?: string
}

export function LandlordCard({ landlord, className }: LandlordCardProps) {
  const summary = truncateSummary(buildLandlordSummary({ landlord }), 120)

  return (
    <Link href={`/landlord/${landlord.slug}`} className={cn('group block py-4 border-b border-gray-100 hover:border-gray-200 transition-colors', className)}>
      <div className="flex items-start gap-4">
        {/* Grade badge */}
        <LandlordGrade grade={landlord.grade} size="sm" />

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900 text-sm group-hover:text-teal-700 transition-colors">
              {landlord.display_name}
            </h3>
            {landlord.is_verified && <VerifiedBadge size="sm" />}
          </div>

          {landlord.business_name && (
            <p className="text-xs text-gray-400 mt-0.5 truncate">{landlord.business_name}</p>
          )}

          {(landlord.city || landlord.state_abbr) && (
            <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              <span>{[landlord.city, landlord.state_abbr].filter(Boolean).join(', ')}</span>
            </div>
          )}

          {summary && (
            <p className="mt-1.5 text-xs text-gray-500 leading-relaxed line-clamp-2">{summary}</p>
          )}

          <div className="mt-2 flex items-center gap-4 flex-wrap">
            {landlord.avg_rating > 0 && landlord.review_count > 0 ? (
              <div className="flex items-center gap-1.5">
                <StarRating value={landlord.avg_rating} readonly size="sm" />
                <span className="text-xs text-gray-400">
                  {landlord.review_count} {landlord.review_count === 1 ? 'review' : 'reviews'}
                </span>
              </div>
            ) : (
              <span className="text-xs text-gray-400 italic">No reviews yet</span>
            )}

            {landlord.eviction_count > 0 && (
              <div className="flex items-center gap-1 text-xs text-orange-600 font-medium">
                <Gavel className="h-3 w-3" />
                <span>{landlord.eviction_count} eviction{landlord.eviction_count !== 1 ? 's' : ''}</span>
              </div>
            )}
            {landlord.open_violation_count > 0 && (
              <div className="flex items-center gap-1 text-xs text-red-600 font-medium">
                <AlertTriangle className="h-3 w-3" />
                <span>{landlord.open_violation_count} open violation{landlord.open_violation_count !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        </div>

        <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-teal-400 flex-shrink-0 mt-0.5 transition-colors" />
      </div>
    </Link>
  )
}
