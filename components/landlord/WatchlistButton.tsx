'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface WatchlistButtonProps {
  landlordId: string
}

export function WatchlistButton({ landlordId }: WatchlistButtonProps) {
  const [watching, setWatching] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase
        .from('watchlist')
        .select('id')
        .eq('user_id', user.id)
        .eq('landlord_id', landlordId)
        .single()
      setWatching(!!data)
    })
  }, [landlordId]) // eslint-disable-line

  async function toggle() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      // Send the visitor to sign in, then bring them back here so the
      // alert intent is preserved instead of dead-ended.
      const here = typeof window !== 'undefined' ? window.location.pathname : '/'
      toast.message('Sign in to set alerts', {
        action: { label: 'Sign in', onClick: () => { window.location.href = `/login?redirectTo=${encodeURIComponent(here)}` } },
      })
      return
    }
    setLoading(true)
    try {
      if (watching) {
        await supabase.from('watchlist').delete().eq('user_id', user.id).eq('landlord_id', landlordId)
        setWatching(false)
        toast.success('Alert removed')
      } else {
        // Upsert in case the user double-tapped — idempotent under the
        // unique index added in migration 111.
        await supabase
          .from('watchlist')
          .upsert(
            { user_id: user.id, landlord_id: landlordId },
            { onConflict: 'user_id,landlord_id', ignoreDuplicates: true },
          )
        setWatching(true)
        toast.success('You\'ll be notified of new violations or reviews')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggle}
      disabled={loading}
      className={watching ? 'border-teal-300 text-teal-700 bg-teal-50 hover:bg-teal-100' : 'border-gray-200 text-gray-600'}
    >
      {watching ? <BellOff className="h-3.5 w-3.5 mr-1.5" /> : <Bell className="h-3.5 w-3.5 mr-1.5" />}
      {watching ? 'Watching' : 'Watch Landlord'}
    </Button>
  )
}
