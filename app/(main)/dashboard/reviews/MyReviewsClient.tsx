'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2, Clock, XCircle, AlertTriangle, Edit3, Trash2, Star, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'

export interface MyReviewItem {
  id: string
  title: string
  body: string
  status: 'pending' | 'approved' | 'rejected' | 'flagged'
  rating_overall: number
  rating_responsiveness: number | null
  rating_maintenance: number | null
  rating_honesty: number | null
  rating_lease_fairness: number | null
  would_rent_again: boolean | null
  is_current_tenant: boolean
  lease_verified: boolean
  created_at: string
  admin_notes: string | null
  landlord: { display_name: string; slug: string; city: string | null; state_abbr: string | null } | null
}

const FILTERS: { key: string; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'flagged', label: 'Flagged' },
]

const STATUS_META: Record<string, { label: string; icon: typeof Clock; className: string }> = {
  pending:  { label: 'Pending',  icon: Clock,         className: 'border-amber-200 text-amber-800 bg-amber-50' },
  approved: { label: 'Live',     icon: CheckCircle2,  className: 'border-teal-200 text-teal-800 bg-teal-50' },
  rejected: { label: 'Rejected', icon: XCircle,       className: 'border-red-200 text-red-700 bg-red-50' },
  flagged:  { label: 'Flagged',  icon: AlertTriangle, className: 'border-orange-200 text-orange-700 bg-orange-50' },
}

export function MyReviewsClient({ reviews, statusFilter }: { reviews: MyReviewItem[]; statusFilter: string }) {
  const router = useRouter()
  const [editing, setEditing] = useState<string | null>(null)
  const [processing, setProcessing] = useState<string | null>(null)

  async function handleDelete(reviewId: string, title: string) {
    if (!confirm(`Delete your pending review "${title}"? This cannot be undone.`)) return
    setProcessing(reviewId)
    try {
      const res = await fetch(`/api/reviews/${reviewId}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Failed to delete')
      }
      toast.success('Review deleted')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setProcessing(null)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-[1100px] px-6 py-10">
        <Link href="/dashboard" className="mb-5 inline-flex items-center gap-1.5 text-[13px] text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
        </Link>

        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-[clamp(1.75rem,3.5vw,2.5rem)] leading-tight tracking-tight text-slate-900">My reviews</h1>
            <p className="mt-1.5 text-[14px] text-slate-500">{reviews.length} review{reviews.length === 1 ? '' : 's'} · Edit or delete while still pending.</p>
          </div>
          <Button asChild className="rounded-full bg-navy-600 hover:bg-navy-700 text-white">
            <Link href="/review/new">Write a new review</Link>
          </Button>
        </div>

        <div className="mb-5 flex flex-wrap gap-1.5">
          {FILTERS.map(f => {
            const active = statusFilter === f.key
            return (
              <Link
                key={f.key}
                href={f.key === 'all' ? '/dashboard/reviews' : `/dashboard/reviews?status=${f.key}`}
                className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition-colors ${
                  active ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-800'
                }`}
              >
                {f.label}
              </Link>
            )
          })}
        </div>

        {reviews.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
            <Star className="mx-auto mb-3 h-8 w-8 text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">No {statusFilter === 'all' ? '' : `${statusFilter} `}reviews yet</p>
            <p className="mt-1 text-[13px] text-slate-500">Your reviews live here once you submit them.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {reviews.map(r => {
              const meta = (STATUS_META[r.status] ?? STATUS_META.pending)!
              const Icon = meta.icon
              const canEditOrDelete = r.status === 'pending'
              const isEditing = editing === r.id
              return (
                <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1.5 flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={`text-[11px] ${meta.className}`}>
                          <Icon className="mr-1 h-3 w-3" />
                          {meta.label}
                        </Badge>
                        {r.lease_verified && (
                          <Badge variant="outline" className="text-[11px] border-teal-200 text-teal-700 bg-teal-50">
                            Lease verified
                          </Badge>
                        )}
                        <span className="text-[12px] text-slate-400">{formatDate(r.created_at)}</span>
                      </div>
                      <h2 className="text-[16px] font-bold text-slate-900">{r.title}</h2>
                      <p className="mt-1 text-[13.5px] leading-relaxed text-slate-600 line-clamp-3">{r.body}</p>
                      <div className="mt-2 flex items-center gap-3 text-[12.5px] text-slate-500">
                        <span className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating_overall ? 'fill-amber-400 text-amber-400' : 'text-slate-200 fill-slate-200'}`} />
                          ))}
                        </span>
                        {r.landlord && (
                          <span>
                            {r.landlord.display_name}
                            {r.landlord.city && <> · {r.landlord.city}{r.landlord.state_abbr ? `, ${r.landlord.state_abbr}` : ''}</>}
                          </span>
                        )}
                      </div>
                      {r.status === 'rejected' && r.admin_notes && (
                        <div className="mt-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-[12.5px] text-red-800">
                          <span className="font-semibold">Admin note:</span> {r.admin_notes}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-1.5">
                      {r.status === 'approved' && r.landlord?.slug && (
                        <Button asChild variant="outline" size="sm" className="h-8 rounded-full">
                          <Link href={`/landlord/${r.landlord.slug}`}>
                            <Eye className="mr-1 h-3.5 w-3.5" /> View
                          </Link>
                        </Button>
                      )}
                      {canEditOrDelete && !isEditing && (
                        <Button variant="outline" size="sm" className="h-8 rounded-full" onClick={() => setEditing(r.id)}>
                          <Edit3 className="mr-1 h-3.5 w-3.5" /> Edit
                        </Button>
                      )}
                      {canEditOrDelete && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-full border-red-200 text-red-700 hover:bg-red-50"
                          onClick={() => handleDelete(r.id, r.title)}
                          disabled={processing === r.id}
                        >
                          <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                        </Button>
                      )}
                    </div>
                  </div>

                  {isEditing && (
                    <EditReviewInline
                      review={r}
                      onCancel={() => setEditing(null)}
                      onSaved={() => { setEditing(null); router.refresh() }}
                    />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function EditReviewInline({ review, onCancel, onSaved }: {
  review: MyReviewItem
  onCancel: () => void
  onSaved: () => void
}) {
  const [title, setTitle] = useState(review.title)
  const [body, setBody] = useState(review.body)
  const [ratingOverall, setRatingOverall] = useState(review.rating_overall)
  const [wouldRentAgain, setWouldRentAgain] = useState<boolean | null>(review.would_rent_again)
  const [saving, setSaving] = useState(false)

  async function save() {
    if (title.trim().length < 10) { toast.error('Title must be at least 10 characters'); return }
    if (body.trim().length < 50) { toast.error('Review body must be at least 50 characters'); return }
    setSaving(true)
    try {
      const res = await fetch(`/api/reviews/${review.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          ratingOverall,
          wouldRentAgain,
        }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Failed to save')
      }
      toast.success('Review updated')
      onSaved()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-5 border-t border-slate-100 pt-5">
      <div className="grid gap-4">
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Title</span>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={150}
            className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-100"
          />
          <span className="mt-1 text-[11px] text-slate-400">{title.length}/150</span>
        </label>
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Review</span>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={6}
            maxLength={2000}
            className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-100"
          />
          <span className="mt-1 text-[11px] text-slate-400">{body.length}/2000</span>
        </label>
        <div className="flex flex-wrap items-center gap-5">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Overall rating</span>
            <div className="mt-1.5 flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setRatingOverall(v)}
                  className="p-0.5"
                  aria-label={`${v} star${v > 1 ? 's' : ''}`}
                >
                  <Star className={`h-5 w-5 transition-colors ${v <= ratingOverall ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Would rent again?</span>
            <div className="mt-1.5 flex items-center gap-1">
              {[
                { v: true, label: 'Yes' },
                { v: false, label: 'No' },
                { v: null, label: 'Not sure' },
              ].map(opt => {
                const active = wouldRentAgain === opt.v
                return (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => setWouldRentAgain(opt.v)}
                    className={`rounded-full border px-3 py-1 text-[12px] font-medium transition-colors ${active ? 'border-navy-500 bg-navy-50 text-navy-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
          <Button size="sm" variant="outline" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
