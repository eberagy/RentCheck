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
        'cursor-pointer overflow-hidden border-l-4 border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] shadow-sm transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-navy-200 group-hover:shadow-[0_24px_70px_rgba(15,23,42,0.10)]',
        gradeBorder,
        className
      )}>
        <div className="h-1 bg-gradient-to-r from-transparent via-sky-100 to-transparent" />
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-semibold leading-snug text-slate-950 transition-colors group-hover:text-navy-700">
                  {landlord.display_name}
                </h3>
                {landlord.is_verified && <VerifiedBadge size="sm" />}
              </div>
              {landlord.business_name && (
                <p className="mt-1 truncate text-xs text-slate-500">{landlord.business_name}</p>
              )}
              {(landlord.city || landlord.state_abbr) && (
                <div className="mt-1.5 flex items-center gap-1 text-xs text-slate-500">
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  <span>{[landlord.city, landlord.state_abbr].filter(Boolean).join(', ')}</span>
                </div>
              )}
              <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-600">{summary}</p>
            </div>
            <LandlordGrade grade={landlord.grade} size="sm" />
          </div>

          <div className="mt-4 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-3">
              {landlord.avg_rating > 0 ? (
                <>
                  <StarRating value={landlord.avg_rating} readonly size="sm" />
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <MessageSquare className="h-3 w-3" />
                    <span>{landlord.review_count} {landlord.review_count === 1 ? 'review' : 'reviews'}</span>
                  </div>
                </>
              ) : (
                <span className="text-xs italic text-slate-400">No reviews yet</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {landlord.eviction_count > 0 && (
                <div className="flex items-center gap-1 rounded-full bg-orange-50 px-2 py-1 text-xs font-medium text-orange-700">
                  <Gavel className="h-3 w-3" />
                  <span>{landlord.eviction_count} eviction{landlord.eviction_count !== 1 ? 's' : ''}</span>
                </div>
              )}
              {landlord.open_violation_count > 0 && (
                <div className="flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700">
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
