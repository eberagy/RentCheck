'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, X } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  searchId: string
  city: string
  stateAbbr: string
}

/**
 * Compact unsubscribe button for the dashboard "City alerts" row.
 * Clicking removes the saved_search via /api/saved-searches?id=...
 * and refreshes the route so the row disappears immediately.
 */
export function SavedSearchUnsubscribeButton({ searchId, city, stateAbbr }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function handle(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (busy) return
    setBusy(true)
    try {
      const res = await fetch(`/api/saved-searches?id=${searchId}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Could not unsubscribe')
      }
      toast.success(`Unsubscribed from ${city}, ${stateAbbr}`)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not unsubscribe')
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={busy}
      title={`Unsubscribe from ${city}, ${stateAbbr}`}
      aria-label={`Unsubscribe from ${city}, ${stateAbbr}`}
      className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-400 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
    </button>
  )
}
