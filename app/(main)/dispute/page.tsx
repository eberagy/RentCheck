'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import { AlertCircle, CheckCircle2, ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

const REASON_OPTIONS = [
  'This record does not belong to this landlord or property',
  'This violation has been corrected / resolved',
  'The record contains factual errors',
  'I am the landlord and this record is misattributed',
  'The underlying government data is incorrect',
  'Other',
]

function DisputeForm() {
  const searchParams = useSearchParams()
  const recordId = searchParams.get('record') ?? ''

  const [reason, setReason] = useState('')
  const [customReason, setCustomReason] = useState('')
  const [detail, setDetail] = useState('')
  const [evidenceUrl, setEvidenceUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const finalReason = reason === 'Other' ? customReason : reason

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!finalReason.trim()) { toast.error('Please select a reason'); return }
    if (!recordId) { toast.error('No record specified'); return }

    setSubmitting(true)
    try {
      const res = await fetch('/api/dispute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordId,
          reason: finalReason,
          detail: detail || undefined,
          evidenceUrl: evidenceUrl || undefined,
        }),
      })
      const data = await res.json()
      if (res.status === 401) { toast.error('Sign in to submit a dispute'); return }
      if (res.status === 409) { toast.info('You already have an open dispute for this record'); return }
      if (!res.ok) { toast.error(data.error ?? 'Submission failed'); return }
      setDone(true)
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="text-center py-8">
        <CheckCircle2 className="h-14 w-14 text-teal-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Dispute submitted</h2>
        <p className="text-gray-600 mb-2">Our team will review your dispute within 5–7 business days.</p>
        <p className="text-sm text-gray-500 mb-8">
          If the record is found to be inaccurate, we will update or remove it.
          For errors in the original government data, we will refer you to the source agency.
        </p>
        <div className="flex gap-3 justify-center">
          <Button asChild className="bg-navy-500 hover:bg-navy-600 text-white">
            <Link href="/">Back to Home</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/contact">Contact Support</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {!recordId && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          No record ID found. Please use the "Dispute this record" link on a public record card.
        </div>
      )}

      <div>
        <Label className="text-sm font-semibold text-gray-900 block mb-3">
          Reason for dispute <span className="text-red-500">*</span>
        </Label>
        <div className="space-y-2">
          {REASON_OPTIONS.map(opt => (
            <label key={opt} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              reason === opt ? 'border-navy-400 bg-navy-50' : 'border-gray-200 hover:border-gray-300'
            }`}>
              <input
                type="radio"
                name="reason"
                value={opt}
                checked={reason === opt}
                onChange={() => setReason(opt)}
                className="text-navy-500 focus:ring-navy-400"
              />
              <span className="text-sm text-gray-700">{opt}</span>
            </label>
          ))}
        </div>
        {reason === 'Other' && (
          <Input
            className="mt-2"
            placeholder="Describe your reason..."
            value={customReason}
            onChange={e => setCustomReason(e.target.value)}
            required
          />
        )}
      </div>

      <div>
        <Label htmlFor="detail" className="text-sm font-semibold text-gray-900 block mb-1.5">
          Additional details
          <span className="text-gray-400 font-normal ml-1">(optional)</span>
        </Label>
        <Textarea
          id="detail"
          value={detail}
          onChange={e => setDetail(e.target.value)}
          placeholder="Provide any context that will help us investigate — e.g. case was dismissed, violation was fixed on [date], property was sold..."
          rows={4}
          maxLength={2000}
          className="text-sm resize-none"
        />
        <p className="text-xs text-gray-400 text-right mt-0.5">{detail.length}/2000</p>
      </div>

      <div>
        <Label htmlFor="evidence" className="text-sm font-semibold text-gray-900 block mb-1.5">
          Evidence URL
          <span className="text-gray-400 font-normal ml-1">(optional)</span>
        </Label>
        <Input
          id="evidence"
          type="url"
          value={evidenceUrl}
          onChange={e => setEvidenceUrl(e.target.value)}
          placeholder="https://... (link to government portal, court ruling, etc.)"
          className="text-sm"
        />
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 leading-relaxed">
        <strong>Note:</strong> RentCheck does not modify government records directly. If the underlying government data contains an error,
        we will refer you to the source agency and can add a "disputed" flag to the record in our database while it is under review.
      </div>

      <Button
        type="submit"
        disabled={submitting || !recordId || !finalReason.trim()}
        className="w-full bg-navy-500 hover:bg-navy-600 text-white font-semibold"
      >
        {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting…</> : 'Submit Dispute'}
      </Button>
    </form>
  )
}

export default function DisputePage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Link href="javascript:history.back()" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <div className="flex items-center gap-3 mb-2">
        <div className="h-10 w-10 bg-amber-50 rounded-xl flex items-center justify-center">
          <AlertCircle className="h-5 w-5 text-amber-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Dispute a Public Record</h1>
      </div>
      <p className="text-gray-500 mb-8 leading-relaxed">
        If you believe a public record on RentCheck is inaccurate, out of date, or misattributed,
        submit a dispute below. Our team reviews all disputes within 5–7 business days.
      </p>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <Suspense fallback={<div className="h-40 flex items-center justify-center text-gray-400 text-sm">Loading…</div>}>
          <DisputeForm />
        </Suspense>
      </div>
    </div>
  )
}
