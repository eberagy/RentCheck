'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, Loader2, ExternalLink } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'

type Dispute = {
  id: string
  status: string
  reason: string
  detail: string | null
  created_at: string
  admin_notes: string | null
  admin_decision: string | null
  submitter: { full_name: string | null; email: string | null } | null
  record: {
    id: string
    record_type: string
    description: string | null
    source: string
    source_url: string | null
    landlord: { display_name: string } | null
    property: { address_line1: string; city: string } | null
  } | null
}

const RESOLUTION_OPTIONS = [
  { value: 'record_removed', label: 'Remove the record' },
  { value: 'record_updated', label: 'Update record with note' },
  { value: 'no_action', label: 'No action — record accurate' },
  { value: 'referred_to_source', label: 'Referred to source agency' },
]

export default function AdminDisputesPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('open')
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [decision, setDecision] = useState<Record<string, string>>({})
  const [processing, setProcessing] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => { loadDisputes() }, [filter]) // eslint-disable-line

  async function loadDisputes() {
    setLoading(true)
    const q = supabase
      .from('record_disputes')
      .select('id, status, reason, detail, created_at, admin_notes, admin_decision, submitter:profiles!record_disputes_disputed_by_fkey(full_name, email), record:public_records(id, record_type, description, source, source_url, landlord:landlords(display_name), property:properties(address_line1, city))')
      .order('created_at', { ascending: true })
    if (filter !== 'all') q.eq('status', filter)
    const { data } = await q.limit(50)
    setDisputes((data ?? []) as unknown as Dispute[])
    setLoading(false)
  }

  async function resolveDispute(disputeId: string, d: Dispute) {
    const dec = decision[disputeId]
    if (!dec) { toast.error('Select a resolution'); return }

    setProcessing(disputeId)
    try {
      const res = await fetch('/api/admin/resolve-dispute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          disputeId,
          decision: dec,
          adminNotes: notes[disputeId],
          recordId: dec === 'record_removed' ? d.record?.id : undefined,
        }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Failed')
      }
      toast.success('Dispute resolved')
      setDisputes(prev => prev.filter(x => x.id !== disputeId))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to resolve dispute')
    } finally {
      setProcessing(null)
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Record Disputes</h1>
          <p className="text-sm text-gray-500 mt-0.5">Review disputes submitted about public records</p>
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v ?? 'open')}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-navy-500" /></div>
      ) : disputes.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <CheckCircle2 className="h-10 w-10 text-teal-400 mx-auto mb-3" />
          <p className="font-medium">No {filter} disputes</p>
        </div>
      ) : (
        <div className="space-y-4">
          {disputes.map(dispute => (
            <Card key={dispute.id} className="border-gray-200">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      <span className="font-semibold text-gray-900">Dispute: {dispute.reason}</span>
                      <Badge variant="outline" className={
                        dispute.status === 'open' ? 'text-amber-700 border-amber-300' : 'text-teal-700 border-teal-300'
                      }>{dispute.status}</Badge>
                    </div>
                    {dispute.detail && <p className="text-sm text-gray-600">{dispute.detail}</p>}
                    <p className="text-xs text-gray-400 mt-1">
                      By {dispute.submitter?.full_name ?? dispute.submitter?.email ?? 'Unknown'} · {formatDate(dispute.created_at)}
                    </p>
                  </div>
                </div>

                {/* The disputed record */}
                {dispute.record && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                    <p className="text-xs font-medium text-amber-800 mb-1">Disputed Record</p>
                    <p className="text-sm font-medium text-gray-900 capitalize">{dispute.record.record_type.replace(/_/g, ' ')}</p>
                    {dispute.record.description && <p className="text-sm text-gray-600">{dispute.record.description}</p>}
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span>Source: {dispute.record.source}</span>
                      {dispute.record.landlord && <span>Landlord: {dispute.record.landlord.display_name}</span>}
                      {dispute.record.property && <span>{dispute.record.property.address_line1}, {dispute.record.property.city}</span>}
                    </div>
                    {dispute.record.source_url && (
                      <a href={dispute.record.source_url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-navy-600 hover:underline mt-1">
                        <ExternalLink className="h-3 w-3" /> View source
                      </a>
                    )}
                  </div>
                )}

                {dispute.status === 'open' && (
                  <>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <p className="text-xs text-gray-500 mb-1 font-medium">Resolution</p>
                        <Select value={decision[dispute.id] ?? ''} onValueChange={v => setDecision(prev => ({ ...prev, [dispute.id]: v ?? '' }))}>
                          <SelectTrigger className="text-sm">
                            <SelectValue placeholder="Choose resolution..." />
                          </SelectTrigger>
                          <SelectContent>
                            {RESOLUTION_OPTIONS.map(o => (
                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1 font-medium">Admin Notes</p>
                        <Textarea
                          placeholder="Internal notes or message to disputer..."
                          value={notes[dispute.id] ?? ''}
                          onChange={e => setNotes(prev => ({ ...prev, [dispute.id]: e.target.value }))}
                          rows={2}
                          className="text-sm"
                        />
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="bg-navy-500 hover:bg-navy-600 text-white"
                      onClick={() => resolveDispute(dispute.id, dispute)}
                      disabled={processing === dispute.id || !decision[dispute.id]}
                    >
                      {processing === dispute.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                      Resolve Dispute
                    </Button>
                  </>
                )}

                {dispute.status === 'resolved' && dispute.admin_decision && (
                  <div className="bg-gray-50 rounded-lg p-3 text-sm">
                    <p className="font-medium text-gray-700">Resolution: <span className="text-gray-900">{RESOLUTION_OPTIONS.find(o => o.value === dispute.admin_decision)?.label ?? dispute.admin_decision}</span></p>
                    {dispute.admin_notes && <p className="text-gray-500 mt-0.5">{dispute.admin_notes}</p>}
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
