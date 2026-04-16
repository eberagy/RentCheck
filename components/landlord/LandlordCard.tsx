import Link from 'next/link'
import { MapPin, MessageSquare, AlertTriangle, Gavel } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { VerifiedBadge } from './VerifiedBadge'
import { LandlordGrade } from './LandlordGrade'
import { StarRating } from '@/components/review/StarRating'
import { cn } from '@/lib/utils'
import { buildLandlordSummary, truncateSummary } from '@/lib/summaries'
import type { Landlord } from '@/types'

const GRADE_BORDER: Record<string, string> = {
  A: 'border-l-teal-500',
  B: 'border-l-green-500',
  C: 'border-l-yellow-400',
  D: 'border-l-orange-500',
  F: 'border-l-red-500',
}

interface LandlordCardProps {
  landlord: Landlord
  className?: string
}

export function LandlordCard({ landlord, className }: LandlordCardProps) {
  const gradeBorder = GRADE_BORDER[landlord.grade ?? ''] ?? 'border-l-gray-200'
  const summary = truncateSummary(
    buildLandlordSummary({
      landlord,
    }),
    140
  )

  return (
    <Link href={`/landlord/${landlord.slug}`} className="block group">
      <Card className={cn(
        'border-l-4 border-gray-200 cursor-pointer transition-all duration-150 group-hover:shadow-md group-hover:border-l-current',
        gradeBorder,
        className
      )}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-gray-900 text-sm leading-snug group-hover:text-navy-700 transition-colors">
                  {landlord.display_name}
                </h3>
                {landlord.is_verified && <VerifiedBadge size="sm" />}
              </div>
              {landlord.business_name && (
                <p className="text-xs text-gray-500 mt-0.5 truncate">{landlord.business_name}</p>
              )}
              {(landlord.city || landlord.state_abbr) && (
                <div className="flex items-center gap-1 mt-1.5 text-xs text-gray-500">
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  <span>{[landlord.city, landlord.state_abbr].filter(Boolean).join(', ')}</span>
                </div>
              )}
              <p className="mt-2 text-xs leading-relaxed text-gray-600 line-clamp-2">{summary}</p>
            </div>
            <LandlordGrade grade={landlord.grade} size="sm" />
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-3">
              {landlord.avg_rating > 0 ? (
                <>
                  <StarRating value={landlord.avg_rating} readonly size="sm" />
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <MessageSquare className="h-3 w-3" />
                    <span>{landlord.review_count} {landlord.review_count === 1 ? 'review' : 'reviews'}</span>
                  </div>
                </>
              ) : (
                <span className="text-xs text-gray-400 italic">No reviews yet</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {landlord.eviction_count > 0 && (
                <div className="flex items-center gap-1 text-xs text-orange-600 font-medium">
                  <Gavel className="h-3 w-3" />
                  <span>{landlord.eviction_count} eviction{landlord.eviction_count !== 1 ? 's' : ''}</span>
                </div>
              )}
              {landlord.open_violation_count > 0 && (
                <div className="flex items-center gap-1 text-xs text-red-600 font-medium">
                  <AlertTriangle className="h-3 w-3" />
                  <span>{landlord.open_violation_count} violation{landlord.open_violation_count !== 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
