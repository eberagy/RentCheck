'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { track } from '@/lib/posthog'
import { captureException } from '@/lib/sentry'

interface WatchlistButtonProps {
  landlordId?: string
  propertyId?: string
  /** Override the resting label. Defaults: "Watch Landlord" / "Watch Property". */
  label?: string
  /** Override the success toast on watch. */
  successMessage?: string
}

export function WatchlistButton({
  landlordId,
  propertyId,
  label,
  successMessage,
}: WatchlistButtonProps) {
  const [watching, setWatching] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const target = landlordId
    ? { col: 'landlord_id' as const, id: landlordId, conflict: 'user_id,landlord_id' }
    : propertyId
      ? { col: 'property_id' as const, id: propertyId, conflict: 'user_id,property_id' }
      : null

  useEffect(() => {
    if (!target) return
    let cancelled = false
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (cancelled || !user) return
      const { data } = await supabase
        .from('watchlist')
        .select('id')
        .eq('user_id', user.id)
        .eq(target.col, target.id)
        .maybeSingle()
      if (!cancelled) setWatching(!!data)
    }).catch(() => {
      // Network or auth lookup failed — leave the button in its default
      // (unwatched) state. We deliberately don't toast here because this
      // runs on every render of a public page; a network blip shouldn't
      // surface noise to anonymous viewers who weren't trying to act.
    })
    return () => { cancelled = true }
  }, [target?.col, target?.id]) // eslint-disable-line

  if (!target) return null

  async function toggle() {
    if (!target) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      const here = typeof window !== 'undefined'
        ? window.location.pathname + window.location.search
        : '/'
      toast.message('Sign in to set alerts', {
        action: { label: 'Sign in', onClick: () => { window.location.href = `/login?redirectTo=${encodeURIComponent(here)}` } },
      })
      return
    }
    setLoading(true)
    try {
      if (watching) {
        const { error } = await supabase.from('watchlist').delete()
          .eq('user_id', user.id)
          .eq(target.col, target.id)
        if (error) throw error
        setWatching(false)
        toast.success('Alert removed')
        track('watchlist_removed', { [target.col]: target.id })
      } else {
        const { error } = await supabase
          .from('watchlist')
          .upsert(
            { user_id: user.id, [target.col]: target.id },
            { onConflict: target.conflict, ignoreDuplicates: true },
          )
        if (error) throw error
        setWatching(true)
        toast.success(successMessage ?? 'You\'ll be notified of new violations or reviews')
        track('watchlist_added', { [target.col]: target.id })
      }
    } catch (err) {
      // Watchlist toggle is one of the most-clicked actions on the
      // landlord/property pages — a sustained failure here is a real
      // engagement hit. Capture so an upstream Supabase regression
      // shows up before users start churning silently.
      captureException(err, { where: 'WatchlistButton:toggle', col: target.col, id: target.id })
      toast.error("Couldn't update your alerts. Try again in a moment.")
    } finally {
      setLoading(false)
    }
  }

  const restLabel = label ?? (landlordId ? 'Watch Landlord' : 'Watch Property')

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggle}
      disabled={loading}
      aria-pressed={watching}
      // aria-busy lets SR users know the toggle is mid-flight rather
      // than just disabled. Sibling buttons (CitySubscribeButton,
      // SavedSearchUnsubscribeButton) already show a spinner during
      // busy; match the visual + a11y here for parity.
      aria-busy={loading || undefined}
      className={watching ? 'border-teal-300 text-teal-700 bg-teal-50 hover:bg-teal-100' : 'border-slate-200 text-slate-600'}
    >
      {loading
        ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" aria-hidden="true" />
        : watching
          ? <BellOff className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
          : <Bell className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />}
      {watching ? 'Watching' : restLabel}
    </Button>
  )
}
