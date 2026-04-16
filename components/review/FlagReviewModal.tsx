'use client'

import { useState } from 'react'
import { Flag, X, Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

const REASONS = [
  { value: 'fake', label: 'Fake or not a real tenant' },
  { value: 'defamatory', label: 'Defamatory or false statements' },
  { value: 'personal_info', label: 'Contains personal information' },
  { value: 'spam', label: 'Spam or irrelevant content' },
  { value: 'harassment', label: 'Harassment or hate speech' },
  { value: 'other', label: 'Other (explain below)' },
] as const

type Reason = typeof REASONS[number]['value']

interface FlagReviewModalProps {
  reviewId: string
  onClose: () => void
}

export function FlagReviewModal({ reviewId, onClose }: FlagReviewModalProps) {
  const [reason, setReason] = useState<Reason | null>(null)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit() {
    if (!reason) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/flag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId, reason, note: note.trim() || undefined }),
      })
      if (res.status === 401) {
        toast.error('Sign in to flag reviews')
        onClose()
        return
      }
      if (res.status === 409) {
        toast.info('You already flagged this review')
        onClose()
        return
      }
      if (!res.ok) {
        toast.error('Failed to submit flag')
        return
      }
      setDone(true)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors">
          <X className="h-5 w-5" />
        </button>

        {done ? (
          <div className="text-center py-4">
            <CheckCircle2 className="h-12 w-12 text-teal-500 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-gray-900 mb-1">Report submitted</h2>
            <p className="text-sm text-gray-500 mb-4">Our team will review this within 48 hours.</p>
            <Button onClick={onClose} className="bg-navy-500 hover:bg-navy-600 text-white">Done</Button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 bg-red-50 rounded-lg flex items-center justify-center">
                <Flag className="h-4 w-4 text-red-500" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Flag this review</h2>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Select why you think this review violates our guidelines. We review all flags within 48 hours.
            </p>

            <div className="space-y-2 mb-4">
              {REASONS.map(r => (
                <label key={r.value} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  reason === r.value ? 'border-navy-400 bg-navy-50' : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input
                    type="radio"
                    name="reason"
                    value={r.value}
                    checked={reason === r.value}
                    onChange={() => setReason(r.value)}
                    className="text-navy-500 focus:ring-navy-400"
                  />
                  <span className="text-sm text-gray-700 font-medium">{r.label}</span>
                </label>
              ))}
            </div>

            {reason && (
              <div className="mb-4">
                <label className="text-xs font-medium text-gray-600 block mb-1.5">
                  Additional details {reason !== 'other' && '(optional)'}
                </label>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Describe the issue..."
                  rows={3}
                  maxLength={500}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-navy-400 transition-colors"
                />
                <p className="text-xs text-gray-400 text-right mt-0.5">{note.length}/500</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
              <Button
                onClick={handleSubmit}
                disabled={!reason || submitting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting…</> : 'Submit Report'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
