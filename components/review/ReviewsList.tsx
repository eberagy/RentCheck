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
      <div className="rounded-[1.5rem] border border-slate-200 bg-white py-16 text-center shadow-sm">
        <MessageSquare className="mx-auto mb-3 h-10 w-10 text-slate-200" />
        <p className="font-medium text-slate-700">No reviews yet</p>
        <p className="mt-1 text-sm text-slate-500">Be the first to review this landlord</p>
        <Button asChild size="sm" className="mt-4 rounded-full bg-slate-950 text-white hover:bg-navy-700">
          <Link href={`/review/new?landlord=${landlordId}`}>Write a Review</Link>
        </Button>
      </div>
    )
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <p className="text-xs text-slate-500">
          {reviews.length} verified review{reviews.length !== 1 ? 's' : ''} · showing all
        </p>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            {(Object.keys(SORT_LABELS) as SortOption[]).map(opt => (
              <button
                key={opt}
                onClick={() => setSort(opt)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  sort === opt
                    ? 'border-slate-950 bg-slate-950 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                {SORT_LABELS[opt]}
              </button>
            ))}
          </div>
          <Button asChild size="sm" className="rounded-full bg-slate-950 text-white hover:bg-navy-700">
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
