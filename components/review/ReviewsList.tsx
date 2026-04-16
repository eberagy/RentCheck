'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { MessageSquare, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ReviewCard } from './ReviewCard'
import type { Review } from '@/types'

type SortOption = 'recent' | 'helpful' | 'highest' | 'lowest'

const SORT_LABELS: Record<SortOption, string> = {
  recent: 'Most Recent',
  helpful: 'Most Helpful',
  highest: 'Highest Rated',
  lowest: 'Lowest Rated',
}

interface ReviewsListProps {
  reviews: Review[]
  landlordId: string
  landlordSlug: string
}

export function ReviewsList({ reviews, landlordId, landlordSlug }: ReviewsListProps) {
  const [sort, setSort] = useState<SortOption>('recent')

  const sorted = useMemo(() => {
    const copy = [...reviews]
    switch (sort) {
      case 'helpful':
        return copy.sort((a, b) => (b.helpful_count ?? 0) - (a.helpful_count ?? 0))
      case 'highest':
        return copy.sort((a, b) => b.rating_overall - a.rating_overall)
      case 'lowest':
        return copy.sort((a, b) => a.rating_overall - b.rating_overall)
      default:
        return copy.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }
  }, [reviews, sort])

  if (reviews.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
        <MessageSquare className="h-10 w-10 text-gray-200 mx-auto mb-3" />
        <p className="font-medium text-gray-700">No reviews yet</p>
        <p className="text-sm text-gray-500 mt-1">Be the first to review this landlord</p>
        <Button asChild size="sm" className="mt-4 bg-navy-500 hover:bg-navy-600 text-white">
          <Link href={`/review/new?landlord=${landlordId}`}>Write a Review</Link>
        </Button>
      </div>
    )
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <p className="text-xs text-gray-500">
          {reviews.length} verified review{reviews.length !== 1 ? 's' : ''} · showing all
        </p>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            {(Object.keys(SORT_LABELS) as SortOption[]).map(opt => (
              <button
                key={opt}
                onClick={() => setSort(opt)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors font-medium ${
                  sort === opt
                    ? 'bg-navy-500 text-white border-navy-500'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
              >
                {SORT_LABELS[opt]}
              </button>
            ))}
          </div>
          <Button asChild size="sm" className="bg-navy-500 hover:bg-navy-600 text-white">
            <Link href={`/review/new?landlord=${landlordId}`}>
              Write a Review <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Cards */}
      <div className="space-y-4">
        {sorted.map(review => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </div>
    </div>
  )
}
