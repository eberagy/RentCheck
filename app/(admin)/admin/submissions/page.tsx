'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, Copy, ExternalLink, Loader2, Building2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'

type Submission = {
  id: string
  display_name: string
  business_name: string | null
  city: string | null
  state_abbr: string | null
  zip: string | null
  website: string | null
  phone: string | null
  notes: string | null
  proof_doc_url: string | null
  status: string
  admin_notes: string | null
  created_at: string
  submitter: { full_name: string | null; email: string | null } | null
}

function ProofDocLink({ path }: { path: string }) {
  const supabase = createClient()
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    supabase.storage.from('landlord-verification-docs').createSignedUrl(path, 3600).then(({ data }) => {
      if (data?.signedUrl) setUrl(data.signedUrl)
    })
  }, [path]) // eslint-disable-line

  if (!url) return null
  return (
    <div className="mb-3">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs text-navy-600 hover:underline bg-navy-50 border border-navy-200 rounded-lg px-3 py-1.5"
      >
        <ExternalLink className="h-3.5 w-3.5" /> View Proof Document
      </a>
    </div>
  )
}

export default function AdminSubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({})
  const [processing, setProcessing] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => { load() }, [filter]) // eslint-disable-line

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/submissions?status=${filter}`)
      if (res.ok) {
        const json = await res.json()
        setSubmissions((json.submissions ?? []) as Submission[])
      } else {
        // Fallback to direct query
        const q = supabase
          .from('landlord_submissions')
          .select('id, display_name, business_name, city, state_abbr, zip, website, phone, notes, proof_doc_url, status, admin_notes, created_at, submitter:profiles!landlord_submissions_submitted_by_fkey(full_name, email)')
          .order('created_at', { ascending: true })
        if (filter !== 'all') q.eq('status', filter)
        const { data } = await q.limit(50)
        setSubmissions((data ?? []) as unknown as Submission[])
      }
    } catch {
      setSubmissions([])
    }
    setLoading(false)
  }

  async function moderate(sub: Submission, action: 'approved' | 'rejected' | 'duplicate') {
    setProcessing(sub.id)
    try {
      const res = await fetch('/api/admin/moderate-submission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId: sub.id,
          action,
          adminNotes: adminNotes[sub.id] || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed')

      if (action === 'approved') {
        toast.success(`Landlord "${sub.display_name}" added to Vett`)
      } else {
        toast.success(`Submission marked as ${action}`)
      }
      setSubmissions(prev => prev.filter(s => s.id !== sub.id))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to process')
    } finally {
      setProcessing(null)
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Landlord Submissions</h1>
          <p className="text-sm text-gray-500 mt-0.5">Community-submitted landlords awaiting review</p>
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v ?? 'pending')}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="duplicate">Duplicate</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-navy-500" /></div>
      ) : submissions.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <Building2 className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="font-medium">No {filter} submissions</p>
        </div>
      ) : (
        <div className="space-y-4">
          {submissions.map(sub => (
            <Card key={sub.id} className="border-gray-200">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-gray-900">{sub.display_name}</span>
                      <Badge variant="outline" className={
                        sub.status === 'approved' ? 'text-teal-700 border-teal-300' :
                        sub.status === 'rejected' ? 'text-red-700 border-red-300' :
                        sub.status === 'duplicate' ? 'text-orange-700 border-orange-300' :
                        'text-amber-700 border-amber-300'
                      }>{sub.status}</Badge>
                    </div>
                    {sub.business_name && <p className="text-sm text-gray-500">{sub.business_name}</p>}
                    <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
                      {sub.city && <span>{sub.city}{sub.state_abbr ? `, ${sub.state_abbr}` : ''}</span>}
                      {sub.phone && <span>{sub.phone}</span>}
                      {sub.website && (
                        <a href={sub.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-navy-600 hover:underline">
                          <ExternalLink className="h-3 w-3" /> Website
                        </a>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">{formatDate(sub.created_at)}</span>
                </div>

                <div className="text-xs text-gray-500 mb-2">
                  Submitted by: <span className="text-gray-700">{sub.submitter?.full_name ?? sub.submitter?.email ?? 'Unknown'}</span>
                  {sub.submitter?.email && ` (${sub.submitter.email})`}
                </div>

                {sub.proof_doc_url && (
                  <ProofDocLink path={sub.proof_doc_url} />
                )}

                {sub.notes && (
                  <div className="bg-gray-50 rounded-lg p-3 mb-3 text-sm text-gray-600">
                    <span className="font-medium">Submitter notes: </span>{sub.notes}
                  </div>
                )}

                {sub.status === 'pending' && (
                  <div className="space-y-3">
                    <Textarea
                      placeholder="Admin notes (optional)..."
                      value={adminNotes[sub.id] ?? ''}
                      onChange={e => setAdminNotes(prev => ({ ...prev, [sub.id]: e.target.value }))}
                      rows={2}
                      className="text-sm"
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        className="bg-teal-600 hover:bg-teal-700 text-white"
                        onClick={() => moderate(sub, 'approved')}
                        disabled={processing === sub.id}
                      >
                        {processing === sub.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
                        Approve &amp; Add to Vett
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-orange-300 text-orange-700 hover:bg-orange-50"
                        onClick={() => moderate(sub, 'duplicate')}
                        disabled={processing === sub.id}
                      >
                        <Copy className="h-3.5 w-3.5 mr-1" />
                        Mark Duplicate
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-300 text-red-700 hover:bg-red-50"
                        onClick={() => moderate(sub, 'rejected')}
                        disabled={processing === sub.id}
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" />
                        Reject
                      </Button>
                    </div>
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
