'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

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
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase
        .from('watchlist')
        .select('id')
        .eq('user_id', user.id)
        .eq(target.col, target.id)
        .maybeSingle()
      setWatching(!!data)
    })
  }, [target?.col, target?.id]) // eslint-disable-line

  if (!target) return null

  async function toggle() {
    if (!target) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      const here = typeof window !== 'undefined' ? window.location.pathname : '/'
      toast.message('Sign in to set alerts', {
        action: { label: 'Sign in', onClick: () => { window.location.href = `/login?redirectTo=${encodeURIComponent(here)}` } },
      })
      return
    }
    setLoading(true)
    try {
      if (watching) {
        await supabase.from('watchlist').delete()
          .eq('user_id', user.id)
          .eq(target.col, target.id)
        setWatching(false)
        toast.success('Alert removed')
      } else {
        await supabase
          .from('watchlist')
          .upsert(
            { user_id: user.id, [target.col]: target.id },
            { onConflict: target.conflict, ignoreDuplicates: true },
          )
        setWatching(true)
        toast.success(successMessage ?? 'You\'ll be notified of new violations or reviews')
      }
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
      className={watching ? 'border-teal-300 text-teal-700 bg-teal-50 hover:bg-teal-100' : 'border-gray-200 text-gray-600'}
    >
      {watching ? <BellOff className="h-3.5 w-3.5 mr-1.5" /> : <Bell className="h-3.5 w-3.5 mr-1.5" />}
      {watching ? 'Watching' : restLabel}
    </Button>
  )
}
