'use client'

import { useState } from 'react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  reviewId: string
  initialAnonymous: boolean
}

/**
 * Compact toggle on the dashboard review row. Lets the owner flip
 * is_anonymous on their own review (works even after approval, since
 * privacy doesn't affect moderation-relevant content).
 */
export function ReviewPrivacyToggle({ reviewId, initialAnonymous }: Props) {
  const [anonymous, setAnonymous] = useState(initialAnonymous)
  const [busy, setBusy] = useState(false)

  async function toggle(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (busy) return
    const next = !anonymous
    setBusy(true)
    setAnonymous(next)
    try {
      const res = await fetch(`/api/reviews/${reviewId}/privacy`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAnonymous: next }),
      })
      if (!res.ok) {
        setAnonymous(!next)
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Could not update')
      }
      toast.success(next ? 'Review is now anonymous' : 'Your name is now shown on this review')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update')
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      title={anonymous ? 'Currently anonymous — click to show your name' : 'Currently showing your name — click to make anonymous'}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-medium transition-colors ${
        anonymous
          ? 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
          : 'border-teal-200 bg-teal-50 text-teal-700 hover:border-teal-300'
      } disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {busy ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : anonymous ? (
        <EyeOff className="h-3 w-3" />
      ) : (
        <Eye className="h-3 w-3" />
      )}
      {anonymous ? 'Anonymous' : 'Showing name'}
    </button>
  )
}
