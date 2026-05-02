'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, Loader2, Flag } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'

type FlagItem = {
  id: string
  reason: string
  note: string | null
  created_at: string
  flagged_by: string
  flagger: { full_name: string | null; email: string | null } | null
  review: {
    id: string
    title: string
    body: string
    status: string
    reviewer: { full_name: string | null } | null
    landlord: { display_name: string } | null
  } | null
}

export default function AdminFlagsPage() {
  const [items, setItems] = useState<FlagItem[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => { loadItems() }, []) // eslint-disable-line

  async function loadItems() {
    setLoading(true)
    const { data } = await supabase
      .from('review_flags')
      .select('id, reason, note, created_at, flagged_by, flagger:profiles!review_flags_flagged_by_fkey(full_name, email), review:reviews(id, title, body, status, reviewer:profiles!reviews_reviewer_id_fkey(full_name), landlord:landlords(display_name))')
      .order('created_at', { ascending: true })
      .limit(50)
    setItems((data ?? []) as unknown as FlagItem[])
    setLoading(false)
  }

  async function dismissFlag(flagId: string) {
    setProcessing(flagId)
    const res = await fetch('/api/admin/moderate-flag', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'dismiss', flagId }),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      toast.error(json.error ?? 'Failed to dismiss')
      setProcessing(null)
      return
    }
    toast.success('Flag dismissed')
    setItems(prev => prev.filter(f => f.id !== flagId))
    setProcessing(null)
  }

  async function removeReview(flagId: string, reviewId: string) {
    setProcessing(flagId)
    const res = await fetch('/api/admin/moderate-flag', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'remove_review', reviewId }),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      toast.error(json.error ?? 'Failed to remove review')
      setProcessing(null)
      return
    }
    toast.success('Review removed and flags cleared')
    setItems(prev => prev.filter(f => f.review?.id !== reviewId))
    setProcessing(null)
  }

  const reasonLabels: Record<string, string> = {
    fake: 'Fake review',
    defamatory: 'Defamatory',
    personal_info: 'Contains personal info',
    spam: 'Spam',
    harassment: 'Harassment',
    other: 'Other',
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Flagged Reviews</h1>
        <p className="text-sm text-gray-500 mt-0.5">Community-reported reviews that need admin review</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-navy-500" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <CheckCircle2 className="h-10 w-10 text-teal-400 mx-auto mb-3" />
          <p className="font-medium">No flagged reviews</p>
          <p className="text-sm mt-1">No community reports to review</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map(item => (
            <Card key={item.id} className="border-gray-200">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <Flag className="h-4 w-4 text-red-500" />
                      <Badge variant="outline" className="text-red-700 border-red-300">
                        {reasonLabels[item.reason] ?? item.reason}
                      </Badge>
                      <span className="text-xs text-gray-400">
                        Flagged by {item.flagger?.full_name ?? item.flagger?.email ?? 'Unknown'} on {formatDate(item.created_at)}
                      </span>
                    </div>

                    {item.note && (
                      <p className="text-sm text-gray-600 mb-3 italic">&ldquo;{item.note}&rdquo;</p>
                    )}

                    {item.review && (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 mb-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm text-gray-900">{item.review.title}</span>
                          <Badge variant="outline" className={
                            item.review.status === 'approved' ? 'text-teal-700 border-teal-300' :
                            item.review.status === 'flagged' ? 'text-red-700 border-red-300' :
                            'text-amber-700 border-amber-300'
                          }>{item.review.status}</Badge>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">{item.review.body}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          by {item.review.reviewer?.full_name ?? 'Anonymous'}
                          {item.review.landlord && ` about ${item.review.landlord.display_name}`}
                        </p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => dismissFlag(item.id)}
                        disabled={processing === item.id}
                      >
                        {processing === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <XCircle className="h-3.5 w-3.5 mr-1" />}
                        Dismiss Flag
                      </Button>
                      {item.review && item.review.status !== 'flagged' && (
                        <Button
                          size="sm"
                          className="bg-red-600 hover:bg-red-700 text-white"
                          onClick={() => removeReview(item.id, item.review!.id)}
                          disabled={processing === item.id}
                        >
                          <Flag className="h-3.5 w-3.5 mr-1" />
                          Remove Review
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
