import type { Metadata } from 'next'
import { BarChart3, Clock, CheckCircle2, TrendingUp, Users } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Admin analytics',
  robots: { index: false, follow: false },
}

// Day of week ordering for the review-volume histogram.
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

export default async function AdminAnalyticsPage() {
  const service = createServiceClient()

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { data: recent },
    { data: prior },
    { count: totalReviews },
    { count: approvedCount },
    { count: rejectedCount },
    { count: flaggedCount },
    { count: landlords },
    { count: leads },
  ] = await Promise.all([
    service
      .from('reviews')
      .select('status, created_at, moderated_at, admin_notes')
      .gte('created_at', thirtyDaysAgo),
    service
      .from('reviews')
      .select('id, created_at')
      .gte('created_at', sixtyDaysAgo)
      .lt('created_at', thirtyDaysAgo),
    service.from('reviews').select('*', { count: 'exact', head: true }),
    service.from('reviews').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    service.from('reviews').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
    service.from('reviews').select('*', { count: 'exact', head: true }).eq('status', 'flagged'),
    service.from('landlords').select('*', { count: 'exact', head: true }),
    service.from('email_leads').select('*', { count: 'exact', head: true }),
  ])

  const recentReviews = recent ?? []
  const reviewsLast30 = recentReviews.length
  const reviewsPrev30 = (prior ?? []).length
  const volumeDelta = reviewsPrev30 === 0 ? null : Math.round(((reviewsLast30 - reviewsPrev30) / reviewsPrev30) * 100)

  // Time-to-moderate: pending → moderated diff, in hours. Uses median.
  const turnaroundHours = recentReviews
    .filter(r => r.moderated_at && r.created_at && r.status !== 'pending')
    .map(r => (new Date(r.moderated_at).getTime() - new Date(r.created_at).getTime()) / 3_600_000)
    .sort((a, b) => a - b)
  const medianTurnaround =
    turnaroundHours.length === 0
      ? null
      : turnaroundHours[Math.floor(turnaroundHours.length / 2)] ?? null

  const moderatedRecent = recentReviews.filter(r => r.status !== 'pending')
  const approvedRecent = moderatedRecent.filter(r => r.status === 'approved').length
  const rejectedRecent = moderatedRecent.filter(r => r.status === 'rejected').length
  const approvalRatio =
    moderatedRecent.length === 0
      ? null
      : Math.round((approvedRecent / moderatedRecent.length) * 100)

  const autoFlaggedRecent = recentReviews.filter(r =>
    r.admin_notes?.toString().toLowerCase().startsWith('auto-flagged'),
  ).length

  // Volume histogram by day-of-week for the last 30 days.
  const dayBuckets = new Array(7).fill(0) as number[]
  for (const r of recentReviews) {
    const d = new Date(r.created_at)
    dayBuckets[d.getUTCDay()] = (dayBuckets[d.getUTCDay()] ?? 0) + 1
  }
  const maxBucket = Math.max(1, ...dayBuckets)

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
          <BarChart3 className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">Last 30 days of moderation activity. Updates on page load.</p>
        </div>
      </div>

      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          icon={Clock}
          label="Median time-to-moderate"
          value={medianTurnaround != null ? `${medianTurnaround.toFixed(1)} h` : '—'}
          sub={moderatedRecent.length > 0 ? `across ${moderatedRecent.length} decisions` : 'no decisions yet'}
        />
        <Metric
          icon={CheckCircle2}
          label="Approval ratio"
          value={approvalRatio != null ? `${approvalRatio}%` : '—'}
          sub={moderatedRecent.length > 0 ? `${approvedRecent} approved · ${rejectedRecent} rejected` : 'no decisions yet'}
          tone={approvalRatio != null && approvalRatio >= 70 ? 'teal' : 'slate'}
        />
        <Metric
          icon={TrendingUp}
          label="Review volume (30d)"
          value={reviewsLast30.toString()}
          sub={volumeDelta == null ? 'no prior window to compare' : `${volumeDelta >= 0 ? '+' : ''}${volumeDelta}% vs. prior 30d`}
          tone={volumeDelta != null && volumeDelta > 0 ? 'teal' : 'slate'}
        />
        <Metric
          icon={Users}
          label="Auto-flagged on submit (30d)"
          value={autoFlaggedRecent.toString()}
          sub="content-filter tripwire"
          tone={autoFlaggedRecent > 0 ? 'amber' : 'slate'}
        />
      </div>

      {/* Volume by weekday */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 mb-6">
        <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
          Reviews submitted by day of week (last 30d)
        </div>
        <div className="grid grid-cols-7 gap-2 items-end h-32">
          {dayBuckets.map((count, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <div className="w-full flex-1 flex items-end">
                <div
                  className="w-full rounded-md bg-navy-500"
                  style={{ height: `${(count / maxBucket) * 100}%`, minHeight: count > 0 ? 4 : 0 }}
                  title={`${count} reviews`}
                />
              </div>
              <div className="text-[11px] text-slate-500">{WEEKDAYS[i]}</div>
              <div className="text-[10.5px] font-semibold tabular-nums text-slate-700">{count}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Totals */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">All-time</div>
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Reviews total" value={(totalReviews ?? 0).toLocaleString()} />
          <Stat label="Approved" value={(approvedCount ?? 0).toLocaleString()} />
          <Stat label="Rejected" value={(rejectedCount ?? 0).toLocaleString()} />
          <Stat label="Flagged" value={(flaggedCount ?? 0).toLocaleString()} />
          <Stat label="Landlords" value={(landlords ?? 0).toLocaleString()} />
          <Stat label="Email leads" value={(leads ?? 0).toLocaleString()} />
        </div>
      </div>
    </div>
  )
}

function Metric({ icon: Icon, label, value, sub, tone = 'slate' }: {
  icon: typeof Clock
  label: string
  value: string
  sub: string
  tone?: 'teal' | 'slate' | 'amber'
}) {
  const valueClass = tone === 'teal' ? 'text-teal-700' : tone === 'amber' ? 'text-amber-700' : 'text-slate-900'
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className={`mt-1.5 text-[28px] font-extrabold tracking-tight tabular-nums ${valueClass}`}>{value}</div>
      <div className="mt-0.5 text-[12px] text-slate-500">{sub}</div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-slate-400">{label}</div>
      <div className="mt-0.5 text-[22px] font-extrabold tracking-tight tabular-nums text-slate-900">{value}</div>
    </div>
  )
}
