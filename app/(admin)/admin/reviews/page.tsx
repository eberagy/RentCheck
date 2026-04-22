'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, Eye, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'

type Review = {
  id: string
  title: string
  body: string
  rating_overall: number
  status: string
  created_at: string
  lease_verified: boolean
  lease_doc_path: string | null
  lease_filename: string | null
  property_address: string | null
  reviewer: { full_name: string | null; email: string | null } | null
  landlord: { display_name: string; slug: string } | null
  property: { address_line1: string; city: string } | null
  admin_notes: string | null
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [processing, setProcessing] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => { loadReviews() }, [filter]) // eslint-disable-line

  async function loadReviews() {
    setLoading(true)
    const q = supabase
      .from('reviews')
      .select('id, title, body, rating_overall, status, created_at, lease_verified, lease_doc_path, lease_filename, admin_notes, property_address, reviewer:profiles!reviews_reviewer_id_fkey(full_name, email), landlord:landlords(display_name, slug), property:properties(address_line1, city)')
      .order('created_at', { ascending: true })
    if (filter !== 'all') q.eq('status', filter)
    const { data } = await q.limit(50)
    setReviews((data ?? []) as unknown as Review[])
    setLoading(false)
  }

  async function moderate(reviewId: string, action: 'approved' | 'rejected') {
    setProcessing(reviewId)
    const res = await fetch('/api/admin/moderate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewId, action, adminNotes: notes[reviewId] }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => null)
      toast.error(data?.error ?? 'Failed to update')
      setProcessing(null)
      return
    }
    toast.success(`Review ${action} — email sent to reviewer`)
    setReviews(prev => prev.filter(r => r.id !== reviewId))
    setProcessing(null)
  }

  const statusCounts = { pending: reviews.filter(r => r.status === 'pending').length }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Review Queue</h1>
          <p className="text-sm text-gray-500 mt-0.5">Only lease-verified reviews can be approved and published</p>
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v ?? 'pending')}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-navy-500" /></div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <CheckCircle2 className="h-10 w-10 text-teal-400 mx-auto mb-3" />
          <p className="font-medium">Queue is empty</p>
          <p className="text-sm mt-1">No {filter} reviews</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map(review => (
            <Card key={review.id} className="border-gray-200">
              <CardContent className="p-0">
                {/* Header row */}
                <div className="p-4 flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-gray-900">{review.title}</span>
                      <span className="text-xs text-gray-500">★ {review.rating_overall}/5</span>
                      <Badge variant="outline" className={
                        review.status === 'approved' ? 'text-teal-700 border-teal-300' :
                        review.status === 'rejected' ? 'text-red-700 border-red-300' :
                        'text-amber-700 border-amber-300'
                      }>{review.status}</Badge>
                      {review.lease_verified ? (
                        <Badge className="bg-teal-100 text-teal-800 border-teal-200">Lease Verified</Badge>
                      ) : review.lease_doc_path ? (
                        <Badge variant="outline" className="text-amber-700 border-amber-300">Lease Pending</Badge>
                      ) : (
                        <Badge variant="outline" className="text-gray-500">No Lease</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{review.body}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500 flex-wrap">
                      <span>{review.reviewer?.full_name ?? review.reviewer?.email ?? 'Unknown'}</span>
                      {review.landlord && <span>→ {review.landlord.display_name}</span>}
                      {review.property_address && <span>@ {review.property_address}</span>}
                      {!review.property_address && review.property && <span>@ {review.property.address_line1}, {review.property.city}</span>}
                      <span>{formatDate(review.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      className="text-gray-400 hover:text-gray-600"
                      onClick={() => setExpanded(expanded === review.id ? null : review.id)}
                    >
                      {expanded === review.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded area */}
                {expanded === review.id && (
                  <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Full Review Body</p>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">{review.body}</p>
                    </div>

                    {review.lease_doc_path && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">Uploaded Lease</p>
                        <div className="flex items-center gap-2">
                          <a
                            href={`/api/admin/lease-url?path=${encodeURIComponent(review.lease_doc_path)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-sm text-navy-600 hover:underline"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            {review.lease_filename ?? 'View Document'}
                          </a>
                        </div>
                      </div>
                    )}

                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Admin Notes (optional)</p>
                      <Textarea
                        placeholder="Reason for rejection, or internal note..."
                        value={notes[review.id] ?? ''}
                        onChange={e => setNotes(prev => ({ ...prev, [review.id]: e.target.value }))}
                        rows={2}
                        className="text-sm"
                      />
                    </div>

                    {review.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="bg-teal-600 hover:bg-teal-700 text-white"
                          onClick={() => moderate(review.id, 'approved')}
                          disabled={processing === review.id || !review.lease_verified}
                        >
                          {processing === review.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-300 text-red-700 hover:bg-red-50"
                          onClick={() => moderate(review.id, 'rejected')}
                          disabled={processing === review.id}
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" />
                          Reject
                        </Button>
                      </div>
                    )}
                    {review.status === 'pending' && !review.lease_verified && (
                      <p className="text-xs text-amber-700">
                        Verify the uploaded lease in the Lease Verification queue before approving this review.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
