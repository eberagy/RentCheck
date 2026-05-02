'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, Eye, Loader2, Building2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'

const DOC_TYPE_LABELS: Record<string, string> = {
  utility_bill: 'Utility Bill',
  government_id: 'Government ID + Proof of Property',
  deed: 'Property Deed',
  business_reg: 'Business Registration (LLC/Corp)',
}

type Claim = {
  id: string
  status: string
  created_at: string
  doc_url: string | null
  doc_filename: string | null
  verification_type: string | null
  admin_notes: string | null
  claimed_by: string
  landlord: {
    id: string
    display_name: string
    city: string | null
    state_abbr: string | null
    review_count: number
  } | null
  claimer: { full_name: string | null; email: string | null } | null
}

export default function AdminClaimsPage() {
  const [claims, setClaims] = useState<Claim[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [processing, setProcessing] = useState<string | null>(null)
  const [docUrls, setDocUrls] = useState<Record<string, string>>({})
  const supabase = createClient()

  useEffect(() => { loadClaims() }, [filter]) // eslint-disable-line

  async function loadClaims() {
    setLoading(true)
    const q = supabase
      .from('landlord_claims')
      .select('id, status, created_at, doc_url, doc_filename, verification_type, admin_notes, claimed_by, landlord:landlords(id, display_name, city, state_abbr, review_count), claimer:profiles!landlord_claims_claimed_by_fkey(full_name, email)')
      .order('created_at', { ascending: true })
    if (filter !== 'all') q.eq('status', filter)
    const { data } = await q.limit(50)
    setClaims((data ?? []) as unknown as Claim[])
    setLoading(false)
  }

  async function getDocUrl(claimId: string, path: string) {
    if (docUrls[claimId]) { window.open(docUrls[claimId], '_blank'); return }
    const { data } = await supabase.storage.from('landlord-verification-docs').createSignedUrl(path, 3600)
    if (data?.signedUrl) {
      setDocUrls(prev => ({ ...prev, [claimId]: data.signedUrl }))
      window.open(data.signedUrl, '_blank')
    } else {
      toast.error('Could not generate document URL')
    }
  }

  async function processClaim(claimId: string, action: 'approved' | 'rejected') {
    setProcessing(claimId)
    try {
      const res = await fetch('/api/admin/moderate-claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimId, action, adminNotes: notes[claimId] }),
      })
      if (!res.ok) throw new Error('Failed')
      toast.success(`Claim ${action} — email sent to landlord`)
      setClaims(prev => prev.filter(c => c.id !== claimId))
    } catch {
      toast.error('Failed to process claim')
    } finally {
      setProcessing(null)
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Landlord Claims</h1>
          <p className="text-sm text-gray-500 mt-0.5">Review and approve landlord profile claim requests</p>
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
      ) : claims.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <CheckCircle2 className="h-10 w-10 text-teal-400 mx-auto mb-3" />
          <p className="font-medium">No {filter} claims</p>
        </div>
      ) : (
        <div className="space-y-4">
          {claims.map(claim => (
            <Card key={claim.id} className="border-gray-200">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 className="h-4 w-4 text-navy-500" />
                      <span className="font-semibold text-gray-900">{claim.landlord?.display_name ?? 'Unknown Landlord'}</span>
                      <Badge variant="outline" className={
                        claim.status === 'approved' ? 'text-teal-700 border-teal-300' :
                        claim.status === 'rejected' ? 'text-red-700 border-red-300' :
                        'text-amber-700 border-amber-300'
                      }>{claim.status}</Badge>
                    </div>
                    {claim.landlord?.city && (
                      <p className="text-sm text-gray-500">{claim.landlord.city}, {claim.landlord.state_abbr} · {claim.landlord.review_count} reviews</p>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">{formatDate(claim.created_at)}</span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-500 font-medium mb-0.5">Claimant</p>
                    <p className="text-gray-900">{claim.claimer?.full_name ?? 'Unknown'}</p>
                    <p className="text-gray-500 text-xs">{claim.claimer?.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium mb-0.5">Document Type</p>
                    <p className="text-gray-900">{claim.verification_type ? (DOC_TYPE_LABELS[claim.verification_type] ?? claim.verification_type) : 'Not specified'}</p>
                  </div>
                </div>

                {claim.doc_url && (
                  <button
                    onClick={() => getDocUrl(claim.id, claim.doc_url!)}
                    className="inline-flex items-center gap-1.5 text-sm text-navy-600 hover:text-navy-800 font-medium mb-4"
                  >
                    <Eye className="h-4 w-4" />
                    View Verification Document{claim.doc_filename ? `: ${claim.doc_filename}` : ''}
                  </button>
                )}

                {claim.admin_notes && (
                  <div className="bg-gray-50 rounded-lg p-3 mb-3 text-sm text-gray-600">
                    <span className="font-medium">Admin notes: </span>{claim.admin_notes}
                  </div>
                )}

                {claim.status === 'pending' && (
                  <>
                    <div className="mb-3">
                      <Textarea
                        placeholder="Optional reason — included in rejection email to claimant"
                        value={notes[claim.id] ?? ''}
                        onChange={e => setNotes(prev => ({ ...prev, [claim.id]: e.target.value }))}
                        rows={2}
                        className="text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-teal-600 hover:bg-teal-700 text-white"
                        onClick={() => processClaim(claim.id, 'approved')}
                        disabled={processing === claim.id}
                      >
                        {processing === claim.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
                        Approve Claim
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-300 text-red-700 hover:bg-red-50"
                        onClick={() => processClaim(claim.id, 'rejected')}
                        disabled={processing === claim.id}
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
