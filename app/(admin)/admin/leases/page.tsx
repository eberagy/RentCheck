'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, Eye, FileText, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'

type LeaseReview = {
  id: string
  title: string
  lease_doc_path: string
  lease_filename: string | null
  lease_verified: boolean
  lease_file_size: number | null
  created_at: string
  reviewer: { full_name: string | null; email: string | null } | null
  landlord: { display_name: string } | null
  property: { address_line1: string; city: string; state_abbr: string } | null
}

export default function AdminLeasesPage() {
  const [items, setItems] = useState<LeaseReview[]>([])
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [processing, setProcessing] = useState<string | null>(null)
  const [docUrls, setDocUrls] = useState<Record<string, string>>({})
  const supabase = createClient()

  useEffect(() => { loadItems() }, []) // eslint-disable-line

  async function loadItems() {
    setLoading(true)
    const { data } = await supabase
      .from('reviews')
      .select('id, title, lease_doc_path, lease_filename, lease_verified, lease_file_size, created_at, property_address, reviewer:profiles!reviews_reviewer_id_fkey(full_name, email), landlord:landlords(display_name), property:properties(address_line1, city, state_abbr)')
      .not('lease_doc_path', 'is', null)
      .eq('lease_verified', false)
      .order('created_at', { ascending: true })
      .limit(50)
    setItems((data ?? []) as unknown as LeaseReview[])
    setLoading(false)
  }

  async function getDocUrl(reviewId: string, path: string) {
    if (docUrls[reviewId]) { window.open(docUrls[reviewId], '_blank'); return }
    const { data } = await supabase.storage.from('lease-docs').createSignedUrl(path, 3600)
    if (data?.signedUrl) {
      setDocUrls(prev => ({ ...prev, [reviewId]: data.signedUrl }))
      window.open(data.signedUrl, '_blank')
    } else {
      toast.error('Could not generate document URL')
    }
  }

  async function verifyLease(reviewId: string, verified: boolean) {
    setProcessing(reviewId)
    const updates: Record<string, unknown> = {
      lease_verified: verified,
      lease_verified_at: new Date().toISOString(),
    }
    if (!verified) {
      updates.lease_rejection_reason = notes[reviewId] ?? 'Document could not be verified'
      updates.status = 'rejected'
      updates.admin_notes = notes[reviewId] ?? 'Lease verification failed'
      updates.moderated_at = new Date().toISOString()
    }
    const { error } = await supabase.from('reviews').update(updates).eq('id', reviewId)
    if (error) { toast.error('Update failed'); setProcessing(null); return }
    toast.success(verified ? 'Lease verified' : 'Lease rejected')
    setItems(prev => prev.filter(r => r.id !== reviewId))
    setProcessing(null)
  }

  function formatBytes(bytes: number | null) {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Lease Verification</h1>
        <p className="text-sm text-gray-500 mt-0.5">Review uploaded lease documents before any renter review can be approved and published</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-navy-500" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <CheckCircle2 className="h-10 w-10 text-teal-400 mx-auto mb-3" />
          <p className="font-medium">All caught up</p>
          <p className="text-sm mt-1">No pending lease verifications</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map(item => (
            <Card key={item.id} className="border-gray-200">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <FileText className="h-4 w-4 text-navy-500" />
                      <span className="font-semibold text-gray-900">{item.title}</span>
                    </div>
                    <div className="text-sm text-gray-600 space-y-0.5 mb-3">
                      <p>Reviewer: <span className="font-medium">{item.reviewer?.full_name ?? item.reviewer?.email ?? 'Unknown'}</span></p>
                      {item.landlord && <p>Landlord: <span className="font-medium">{item.landlord.display_name}</span></p>}
                      {(item as any).property_address && <p>Address: <span className="font-medium">{(item as any).property_address}</span></p>}
                      {!(item as any).property_address && item.property && <p>Property: {item.property.address_line1}, {item.property.city}, {item.property.state_abbr}</p>}
                      <p className="text-xs text-gray-400">Submitted {formatDate(item.created_at)} {item.lease_file_size ? `· ${formatBytes(item.lease_file_size)}` : ''}</p>
                    </div>

                    {/* Document viewer button */}
                    <button
                      onClick={() => getDocUrl(item.id, item.lease_doc_path)}
                      className="inline-flex items-center gap-1.5 text-sm text-navy-600 hover:text-navy-800 font-medium mb-4"
                    >
                      <Eye className="h-4 w-4" />
                      View Document: {item.lease_filename ?? 'lease.pdf'}
                    </button>

                    <div className="mb-3">
                      <p className="text-xs text-gray-500 mb-1 font-medium">Rejection reason (if applicable)</p>
                      <Textarea
                        placeholder="Document unclear, name doesn't match, wrong property, etc."
                        value={notes[item.id] ?? ''}
                        onChange={e => setNotes(prev => ({ ...prev, [item.id]: e.target.value }))}
                        rows={2}
                        className="text-sm"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-teal-600 hover:bg-teal-700 text-white"
                        onClick={() => verifyLease(item.id, true)}
                        disabled={processing === item.id}
                      >
                        {processing === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
                        Verify Lease
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-300 text-red-700 hover:bg-red-50"
                        onClick={() => verifyLease(item.id, false)}
                        disabled={processing === item.id}
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" />
                        Reject
                      </Button>
                    </div>
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
