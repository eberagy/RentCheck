'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { MessageSquare, ArrowRight, PenLine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ReviewCard } from './ReviewCard'
import type { Review } from '@/types'

type SortOption = 'recent' | 'helpful' | 'highest' | 'lowest'

const SORT_LABELS: Record<SortOption, string> = {
  recent: 'Recent',
  helpful: 'Helpful',
  highest: 'Highest',
  lowest: 'Lowest',
}

interface ReviewsListProps {
  reviews: Review[]
  landlordId: string
  landlordSlug: string
}

export function ReviewsList({ reviews, landlordId }: ReviewsListProps) {
  const [sort, setSort] = useState<SortOption>('recent')

  const sorted = useMemo(() => {
    const copy = [...reviews]
    switch (sort) {
      case 'helpful':  return copy.sort((a, b) => (b.helpful_count ?? 0) - (a.helpful_count ?? 0))
      case 'highest':  return copy.sort((a, b) => b.rating_overall - a.rating_overall)
      case 'lowest':   return copy.sort((a, b) => a.rating_overall - b.rating_overall)
      default:         return copy.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }
  }, [reviews, sort])

  if (reviews.length === 0) {
    return (
      <div className="py-16 text-center">
        <MessageSquare className="h-9 w-9 text-gray-200 mx-auto mb-3" />
        <p className="font-semibold text-gray-700">No reviews yet</p>
        <p className="text-sm text-gray-400 mt-1">Be the first to review this landlord</p>
        <Button asChild size="sm" className="mt-5 bg-teal-600 hover:bg-teal-700 text-white rounded-full px-5">
          <Link href={`/review/new?landlord=${landlordId}`}>
            <PenLine className="h-3.5 w-3.5 mr-1.5" /> Write a Review
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <p className="text-xs text-gray-400">
          {reviews.length} verified review{reviews.length !== 1 ? 's' : ''}
        </p>
        <div className="flex items-center gap-2">
          {/* Sort pills */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-full p-0.5">
            {(Object.keys(SORT_LABELS) as SortOption[]).map(opt => (
              <button
                key={opt}
                onClick={() => setSort(opt)}
                className={`text-xs px-2.5 py-1 rounded-full transition-all font-medium ${
                  sort === opt
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {SORT_LABELS[opt]}
              </button>
            ))}
          </div>
          <Button asChild size="sm" className="bg-teal-600 hover:bg-teal-700 text-white rounded-full px-4">
            <Link href={`/review/new?landlord=${landlordId}`}>
              <PenLine className="h-3.5 w-3.5 mr-1" /> Review
            </Link>
          </Button>
        </div>
      </div>

      {/* List — no cards, just clean rows */}
      <div className="divide-y divide-gray-100">
        {sorted.map(review => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </div>
    </div>
  )
}
