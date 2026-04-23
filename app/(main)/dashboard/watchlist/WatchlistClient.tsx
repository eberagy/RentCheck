'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Bell, BellOff, Eye, Trash2, AlertTriangle, Gavel, Star, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

export interface WatchlistRow {
  id: string
  created_at: string
  notify_email: boolean
  landlord: {
    id: string
    slug: string
    display_name: string
    business_name: string | null
    city: string | null
    state_abbr: string | null
    avg_rating: number | null
    review_count: number
    open_violation_count: number
    eviction_count: number
    is_verified: boolean
  } | null
}

export function WatchlistClient({ rows }: { rows: WatchlistRow[] }) {
  const router = useRouter()
  const supabase = createClient()
  const [processing, setProcessing] = useState<string | null>(null)
  const [items, setItems] = useState(rows)
  const [sort, setSort] = useState<'recent' | 'violations' | 'name'>('recent')

  const sorted = [...items].sort((a, b) => {
    if (sort === 'violations') {
      return (b.landlord?.open_violation_count ?? 0) - (a.landlord?.open_violation_count ?? 0)
    }
    if (sort === 'name') {
      return (a.landlord?.display_name ?? '').localeCompare(b.landlord?.display_name ?? '')
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  async function toggleNotify(row: WatchlistRow) {
    setProcessing(row.id)
    const newValue = !row.notify_email
    const { error } = await supabase
      .from('watchlist')
      .update({ notify_email: newValue })
      .eq('id', row.id)
    setProcessing(null)
    if (error) { toast.error('Could not update alerts'); return }
    setItems(prev => prev.map(r => r.id === row.id ? { ...r, notify_email: newValue } : r))
    toast.success(newValue ? 'Alerts on' : 'Alerts off')
  }

  async function remove(row: WatchlistRow) {
    if (!confirm(`Remove ${row.landlord?.display_name ?? 'this landlord'} from your watchlist?`)) return
    setProcessing(row.id)
    const { error } = await supabase.from('watchlist').delete().eq('id', row.id)
    setProcessing(null)
    if (error) { toast.error('Could not remove'); return }
    setItems(prev => prev.filter(r => r.id !== row.id))
    toast.success('Removed from watchlist')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-[1100px] px-6 py-10">
        <Link href="/dashboard" className="mb-5 inline-flex items-center gap-1.5 text-[13px] text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
        </Link>

        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-[clamp(1.75rem,3.5vw,2.5rem)] leading-tight tracking-tight text-slate-900">My watchlist</h1>
            <p className="mt-1.5 text-[14px] text-slate-500">
              {items.length} landlord{items.length === 1 ? '' : 's'} watched · Get email alerts when they get new reviews or violations.
            </p>
          </div>
          <Button asChild className="rounded-full bg-navy-600 hover:bg-navy-700 text-white">
            <Link href="/search">Find more landlords</Link>
          </Button>
        </div>

        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
            <Bell className="mx-auto mb-3 h-8 w-8 text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">Your watchlist is empty</p>
            <p className="mt-1 text-[13px] text-slate-500">Find a landlord and tap &ldquo;Watch Landlord&rdquo; on their profile to track updates.</p>
            <div className="mt-4">
              <Link href="/search" className="text-[12.5px] font-medium text-teal hover:underline">
                Browse landlords &rarr;
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center gap-2 text-[12.5px]">
              <span className="text-slate-500">Sort:</span>
              {[
                { key: 'recent', label: 'Recently added' },
                { key: 'violations', label: 'Most violations' },
                { key: 'name', label: 'Name (A–Z)' },
              ].map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setSort(opt.key as typeof sort)}
                  className={`rounded-full px-3 py-1 font-medium transition-colors ${sort === opt.key ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="grid gap-3">
              {sorted.map(row => {
                const l = row.landlord
                if (!l) return null
                return (
                  <div key={row.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link href={`/landlord/${l.slug}`} className="text-[17px] font-bold text-slate-900 hover:text-navy-700 hover:underline">
                            {l.display_name}
                          </Link>
                          {l.is_verified && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-[10.5px] font-semibold text-teal-700">
                              Verified
                            </span>
                          )}
                        </div>
                        {l.business_name && <p className="mt-0.5 text-[13px] text-slate-500">{l.business_name}</p>}
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-[12.5px] text-slate-500">
                          {(l.city || l.state_abbr) && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" />
                              {[l.city, l.state_abbr].filter(Boolean).join(', ')}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1">
                            <Star className="h-3.5 w-3.5 text-amber-400" />
                            {l.avg_rating != null && l.avg_rating > 0 ? l.avg_rating.toFixed(1) : '—'}
                            <span className="text-slate-400">· {l.review_count} review{l.review_count === 1 ? '' : 's'}</span>
                          </span>
                          {l.open_violation_count > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 font-medium text-red-700">
                              <AlertTriangle className="h-3 w-3" />
                              {l.open_violation_count} open violation{l.open_violation_count === 1 ? '' : 's'}
                            </span>
                          )}
                          {l.eviction_count > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 font-medium text-orange-700">
                              <Gavel className="h-3 w-3" />
                              {l.eviction_count} eviction{l.eviction_count === 1 ? '' : 's'}
                            </span>
                          )}
                          <span className="text-slate-400">Added {formatDate(row.created_at)}</span>
                        </div>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-1.5">
                        <Button asChild variant="outline" size="sm" className="h-8 rounded-full">
                          <Link href={`/landlord/${l.slug}`}>
                            <Eye className="mr-1 h-3.5 w-3.5" /> View
                          </Link>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className={`h-8 rounded-full ${row.notify_email ? 'border-teal-300 text-teal-700 bg-teal-50 hover:bg-teal-100' : ''}`}
                          onClick={() => toggleNotify(row)}
                          disabled={processing === row.id}
                        >
                          {row.notify_email ? <Bell className="mr-1 h-3.5 w-3.5" /> : <BellOff className="mr-1 h-3.5 w-3.5" />}
                          {row.notify_email ? 'Alerts on' : 'Alerts off'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-full border-red-200 text-red-700 hover:bg-red-50"
                          onClick={() => remove(row)}
                          disabled={processing === row.id}
                        >
                          <Trash2 className="mr-1 h-3.5 w-3.5" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
