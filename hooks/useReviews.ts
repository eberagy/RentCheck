'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Review } from '@/types'

export function useReviews(landlordId?: string) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const supabase = createClient()

  const fetchReviews = useCallback(async (opts?: { page?: number; sort?: string; rating?: number }) => {
    if (!landlordId) return
    setLoading(true)
    try {
      const params = new URLSearchParams({
        landlordId,
        page: String(opts?.page ?? 1),
        sort: opts?.sort ?? 'newest',
        ...(opts?.rating ? { rating: String(opts.rating) } : {}),
      })
      const res = await fetch(`/api/reviews?${params}`)
      const data = await res.json()
      setReviews(data.reviews ?? [])
      setTotalCount(data.total ?? 0)
      setHasMore(data.hasMore ?? false)
      setPage(opts?.page ?? 1)
    } finally {
      setLoading(false)
    }
  }, [landlordId])

  async function markHelpful(reviewId: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    const { error } = await supabase
      .from('review_helpful')
      .upsert({ review_id: reviewId, user_id: user.id })
    if (!error) {
      setReviews(prev => prev.map(r =>
        r.id === reviewId ? { ...r, helpful_count: r.helpful_count + 1 } : r
      ))
    }
    return !error
  }

  return { reviews, loading, page, hasMore, totalCount, fetchReviews, markHelpful }
}
