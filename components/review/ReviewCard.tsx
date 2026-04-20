'use client'

import { useState } from 'react'
import { ThumbsUp, Flag, CheckCircle2, User, Home } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { StarRating } from './StarRating'
import { RatingBar } from '@/components/landlord/RatingBar'
import { FlagReviewModal } from './FlagReviewModal'
import { formatDate, formatRentalPeriod, formatReviewerName } from '@/lib/utils'
import { toast } from 'sonner'
import type { Review } from '@/types'

interface ReviewCardProps {
  review: Review
  onMarkHelpful?: (id: string) => void
  onFlag?: (id: string) => void
  isOwn?: boolean
}

export function ReviewCard({ review, onMarkHelpful, onFlag, isOwn }: ReviewCardProps) {
  const [helpfulCount, setHelpfulCount] = useState(review.helpful_count)
  const [didVote, setDidVote] = useState(false)
  const [voting, setVoting] = useState(false)
  const [showFlag, setShowFlag] = useState(false)

  const hasSubRatings = !!(review.rating_responsiveness || review.rating_maintenance ||
    review.rating_honesty || review.rating_lease_fairness)

  async function handleHelpful() {
    if (voting) return
    setVoting(true)
    const prev = helpfulCount
    const prevVote = didVote
    setDidVote(!didVote)
    setHelpfulCount(c => didVote ? c - 1 : c + 1)

    try {
      const res = await fetch(`/api/reviews/${review.id}/helpful`, { method: 'PATCH' })
      if (res.status === 401) {
        toast.error('Sign in to mark reviews helpful')
        setDidVote(prevVote)
        setHelpfulCount(prev)
      } else if (!res.ok) {
        setDidVote(prevVote)
        setHelpfulCount(prev)
      } else {
        const data = await res.json()
        setHelpfulCount(data.helpful_count)
        setDidVote(data.voted)
      }
    } catch {
      setDidVote(prevVote)
      setHelpfulCount(prev)
    } finally {
      setVoting(false)
    }
    onMarkHelpful?.(review.id)
  }

  return (
    <>
    {showFlag && <FlagReviewModal reviewId={review.id} onClose={() => setShowFlag(false)} />}
    <div className="py-5 hover:bg-gray-50/50 transition-colors rounded-xl px-2 -mx-2">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Avatar className="h-9 w-9 flex-shrink-0 mt-0.5">
          <AvatarImage src={review.reviewer?.avatar_url ?? undefined} />
          <AvatarFallback className="bg-navy-100 text-navy-700 text-xs font-semibold">
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-semibold text-gray-900">
              {formatReviewerName(review.reviewer?.full_name)}
            </span>
            {review.lease_verified ? (
              <span className="inline-flex items-center gap-1 text-xs bg-teal-50 text-teal-700 border border-teal-200 rounded-full px-2 py-0.5 font-medium">
                <CheckCircle2 className="h-3 w-3" /> Lease Verified
              </span>
            ) : (
              <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5 font-medium">
                Verification pending
              </span>
            )}
            {review.is_current_tenant && (
              <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2 py-0.5 font-medium">
                Current Tenant
              </span>
            )}
            {review.would_rent_again !== null && review.would_rent_again !== undefined && (
              <span className={`text-xs rounded-full px-2 py-0.5 font-medium border ${
                review.would_rent_again
                  ? 'bg-teal-50 text-teal-700 border-teal-200'
                  : 'bg-red-50 text-red-700 border-red-200'
              }`}>
                {review.would_rent_again ? '✓ Would rent again' : '✗ Would not rent again'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <p className="text-xs text-gray-400">
              {formatRentalPeriod(review.rental_period_start, review.rental_period_end, review.is_current_tenant)}
            </p>
            {review.property && (
              <>
                <span className="text-gray-300 text-xs">·</span>
                <span className="flex items-center gap-0.5 text-xs text-gray-400">
                  <Home className="h-3 w-3" />
                  {review.property.address_line1}
                  {review.property.city && `, ${review.property.city}`}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 text-right">
          <StarRating value={review.rating_overall} readonly size="sm" />
          <p className="text-xs text-gray-400 mt-0.5">{formatDate(review.created_at)}</p>
        </div>
      </div>

      {/* Content */}
      <div className="mt-3">
        <h4 className="font-semibold text-gray-900 text-sm leading-snug">{review.title}</h4>
        <p className="text-sm text-gray-700 mt-1.5 leading-relaxed">{review.body}</p>
      </div>

      {/* Sub-ratings — always visible */}
      {hasSubRatings && (
        <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 bg-gray-50 rounded-lg p-3">
          <RatingBar label="Responsiveness" value={review.rating_responsiveness} />
          <RatingBar label="Maintenance" value={review.rating_maintenance} />
          <RatingBar label="Honesty" value={review.rating_honesty} />
          <RatingBar label="Lease Fairness" value={review.rating_lease_fairness} />
        </div>
      )}

      {/* Landlord response */}
      {review.landlord_response && review.landlord_response_status === 'approved' && (
        <div className="mt-3 border-l-4 border-navy-300 bg-navy-50 rounded-r-lg px-4 py-3">
          <p className="text-xs font-semibold text-navy-700 mb-1">
            Landlord Response · {formatDate(review.landlord_response_at)}
          </p>
          <p className="text-sm text-navy-800 leading-relaxed">{review.landlord_response}</p>
        </div>
      )}

      {/* Actions */}
      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-4">
        <button
          onClick={handleHelpful}
          disabled={voting}
          className={`flex items-center gap-1.5 text-xs transition-colors ${
            didVote ? 'text-navy-600 font-semibold' : 'text-gray-500 hover:text-navy-600'
          }`}
        >
          <ThumbsUp className={`h-3.5 w-3.5 ${didVote ? 'fill-navy-600' : ''}`} />
          Helpful {helpfulCount > 0 && `(${helpfulCount})`}
        </button>
        {!isOwn && (
          <button
            onClick={() => setShowFlag(true)}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition-colors"
          >
            <Flag className="h-3.5 w-3.5" />
            Flag
          </button>
        )}
      </div>
    </div>
    </>
  )
}
