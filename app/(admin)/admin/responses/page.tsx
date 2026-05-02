'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, Loader2, MessageSquare } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'

type ResponseItem = {
  id: string
  title: string
  body: string
  landlord_response: string
  landlord_response_status: string
  created_at: string
  reviewer: { full_name: string | null } | null
  landlord: { display_name: string; slug: string } | null
}

export default function AdminResponsesPage() {
  const [items, setItems] = useState<ResponseItem[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const supabase = createClient()

  useEffect(() => { loadItems() }, []) // eslint-disable-line

  async function loadItems() {
    setLoading(true)
    const { data } = await supabase
      .from('reviews')
      .select('id, title, body, landlord_response, landlord_response_status, created_at, reviewer:profiles!reviews_reviewer_id_fkey(full_name), landlord:landlords(display_name, slug)')
      .eq('landlord_response_status', 'pending')
      .not('landlord_response', 'is', null)
      .order('created_at', { ascending: true })
      .limit(50)
    setItems((data ?? []) as unknown as ResponseItem[])
    setLoading(false)
  }

  async function moderate(reviewId: string, action: 'approved' | 'rejected', rejectionReason?: string) {
    setProcessing(reviewId)
    const res = await fetch('/api/admin/moderate-response', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewId, action, adminNotes: rejectionReason?.trim() || undefined }),
    })
    if (!res.ok) {
      toast.error('Failed to update')
      setProcessing(null)
      return
    }
    toast.success(action === 'approved' ? 'Response approved — now visible on review' : 'Response rejected and removed')
    setItems(prev => prev.filter(r => r.id !== reviewId))
    setProcessing(null)
    setRejectingId(null)
    setReason('')
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Landlord Response Queue</h1>
        <p className="text-sm text-gray-500 mt-0.5">Approve or reject landlord responses to tenant reviews before they go public</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-navy-500" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <CheckCircle2 className="h-10 w-10 text-teal-400 mx-auto mb-3" />
          <p className="font-medium">All caught up</p>
          <p className="text-sm mt-1">No pending landlord responses</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map(item => (
            <Card key={item.id} className="border-gray-200">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <MessageSquare className="h-4 w-4 text-navy-500" />
                      <span className="font-semibold text-gray-900">{item.landlord?.display_name ?? 'Unknown Landlord'}</span>
                      <span className="text-xs text-gray-400">responded to</span>
                      <span className="text-sm text-gray-700">&ldquo;{item.title}&rdquo;</span>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 mb-3">
                      <p className="text-xs font-medium text-slate-500 mb-1">Original review by {item.reviewer?.full_name ?? 'Anonymous'}</p>
                      <p className="text-sm text-slate-600 line-clamp-3">{item.body}</p>
                    </div>

                    <div className="rounded-lg border border-navy-200 bg-navy-50 p-3 mb-3">
                      <p className="text-xs font-medium text-navy-700 mb-1">Landlord response</p>
                      <p className="text-sm text-navy-800 whitespace-pre-wrap">{item.landlord_response}</p>
                    </div>

                    {rejectingId === item.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={reason}
                          onChange={e => setReason(e.target.value)}
                          placeholder="Optional reason (will be included in rejection email to the landlord)"
                          rows={2}
                          className="w-full rounded-lg border border-red-200 bg-red-50/50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-red-400 focus:outline-none"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="bg-red-600 hover:bg-red-700 text-white"
                            onClick={() => moderate(item.id, 'rejected', reason)}
                            disabled={processing === item.id}
                          >
                            {processing === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <XCircle className="h-3.5 w-3.5 mr-1" />}
                            Confirm Reject
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => { setRejectingId(null); setReason('') }}
                            disabled={processing === item.id}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="bg-teal-600 hover:bg-teal-700 text-white"
                          onClick={() => moderate(item.id, 'approved')}
                          disabled={processing === item.id}
                        >
                          {processing === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
                          Approve Response
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-300 text-red-700 hover:bg-red-50"
                          onClick={() => setRejectingId(item.id)}
                          disabled={processing === item.id}
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>

                  <Badge variant="outline" className="text-amber-700 border-amber-300 flex-shrink-0">
                    Pending
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
