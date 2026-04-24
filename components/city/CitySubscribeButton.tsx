'use client'

import { useEffect, useState } from 'react'
import { Bell, Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

interface Props {
  city: string
  stateAbbr: string
}

export function CitySubscribeButton({ city, stateAbbr }: Props) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'signed-out' | 'subscribed'>('idle')
  const [busy, setBusy] = useState(false)
  const [subscribedId, setSubscribedId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    let cancelled = false
    async function check() {
      setStatus('loading')
      const { data: { user } } = await supabase.auth.getUser()
      if (cancelled) return
      if (!user) { setStatus('signed-out'); return }
      const res = await fetch('/api/saved-searches')
      if (!res.ok) { setStatus('idle'); return }
      const json = await res.json()
      const existing = (json.searches ?? []).find(
        (s: { city: string; state_abbr: string; id: string }) =>
          s.city.toLowerCase() === city.toLowerCase() && s.state_abbr.toUpperCase() === stateAbbr.toUpperCase(),
      )
      if (cancelled) return
      if (existing) {
        setStatus('subscribed')
        setSubscribedId(existing.id)
      } else {
        setStatus('idle')
      }
    }
    void check()
    return () => { cancelled = true }
  }, [city, stateAbbr, supabase])

  async function subscribe() {
    setBusy(true)
    try {
      const res = await fetch('/api/saved-searches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city, stateAbbr }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Could not subscribe')
      }
      const json = await res.json()
      setSubscribedId(json.search?.id ?? null)
      setStatus('subscribed')
      toast.success(`Subscribed — you'll get a weekly digest for ${city}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not subscribe')
    } finally {
      setBusy(false)
    }
  }

  async function unsubscribe() {
    if (!subscribedId) return
    setBusy(true)
    try {
      const res = await fetch(`/api/saved-searches?id=${subscribedId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Could not unsubscribe')
      setSubscribedId(null)
      setStatus('idle')
      toast.success(`Unsubscribed from ${city}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not unsubscribe')
    } finally {
      setBusy(false)
    }
  }

  if (status === 'loading') {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-[12px] text-slate-300">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Checking…
      </span>
    )
  }

  if (status === 'signed-out') {
    return (
      <a
        href={`/login?redirectTo=/city/${stateAbbr.toLowerCase()}/${city.toLowerCase().replace(/\s+/g, '-')}`}
        className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-[12px] font-medium text-white/90 hover:bg-white/10"
      >
        <Bell className="h-3.5 w-3.5" />
        Sign in to get city alerts
      </a>
    )
  }

  if (status === 'subscribed') {
    return (
      <button
        type="button"
        onClick={unsubscribe}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-full border border-teal-400/40 bg-teal-500/15 px-3.5 py-1.5 text-[12px] font-semibold text-teal-200 hover:bg-teal-500/25 disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
        Subscribed · click to stop
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={subscribe}
      disabled={busy}
      className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-[12px] font-semibold text-white hover:bg-white/20 disabled:opacity-60"
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bell className="h-3.5 w-3.5" />}
      Get weekly alerts for {city}
    </button>
  )
}
