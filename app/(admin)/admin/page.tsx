import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  FileText, ShieldCheck, Flag, AlertTriangle,
  Users, TrendingUp, CheckCircle2, Clock, XCircle,
  Database, Activity, RefreshCw, BarChart3, Eye, MessageSquare, TriangleAlert
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDateRelative } from '@/lib/utils'

export const revalidate = 60

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  const [
    { count: pendingReviews },
    { count: approvedReviews },
    { count: rejectedReviews },
    { count: pendingClaims },
    { count: openDisputes },
    { count: pendingSubmissions },
    { count: totalUsers },
    { count: totalLandlords },
    { count: totalWatchlists },
    { count: totalPublicRecords },
    { count: pendingLeases },
    { count: pendingResponses },
    { count: flaggedReviewCount },
    { data: recentSyncs },
    { data: recentPendingReviews },
    { data: recentPendingSubmissions },
  ] = await Promise.all([
    supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
    supabase.from('landlord_claims').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('record_disputes').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('landlord_submissions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('landlords').select('*', { count: 'exact', head: true }),
    supabase.from('watchlist').select('*', { count: 'exact', head: true }),
    supabase.from('public_records').select('*', { count: 'estimated', head: true }),
    supabase.from('reviews').select('*', { count: 'exact', head: true }).not('lease_doc_path', 'is', null).eq('lease_verified', false),
    supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('landlord_response_status', 'pending').not('landlord_response', 'is', null),
    supabase.from('review_flags').select('*', { count: 'exact', head: true }),
    supabase.from('sync_log').select('*').order('started_at', { ascending: false }).limit(6),
    supabase
      .from('reviews')
      .select('id, title, body, rating_overall, status, created_at, reviewer:profiles!reviews_reviewer_id_fkey(full_name, email)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(5),
    supabase
      .from('landlord_submissions')
      .select('id, display_name, city, state_abbr, created_at, submitter:profiles!landlord_submissions_submitted_by_fkey(full_name, email)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(5),
  ])

  const totalReviews = (pendingReviews ?? 0) + (approvedReviews ?? 0) + (rejectedReviews ?? 0)

  const queues = [
    {
      href: '/admin/reviews',
      label: 'Pending Reviews',
      count: pendingReviews ?? 0,
      icon: FileText,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      urgent: (pendingReviews ?? 0) > 10,
    },
    {
      href: '/admin/claims',
      label: 'Pending Claims',
      count: pendingClaims ?? 0,
      icon: Flag,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      urgent: false,
    },
    {
      href: '/admin/disputes',
      label: 'Open Disputes',
      count: openDisputes ?? 0,
      icon: AlertTriangle,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      urgent: (openDisputes ?? 0) > 5,
    },
    {
      href: '/admin/submissions',
      label: 'Landlord Submissions',
      count: pendingSubmissions ?? 0,
      icon: TrendingUp,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      urgent: (pendingSubmissions ?? 0) > 5,
    },
    {
      href: '/admin/leases',
      label: 'Lease Verifications',
      count: pendingLeases ?? 0,
      icon: ShieldCheck,
      color: 'text-teal-600',
      bg: 'bg-teal-50',
      border: 'border-teal-200',
      urgent: false,
    },
    {
      href: '/admin/responses',
      label: 'Landlord Responses',
      count: pendingResponses ?? 0,
      icon: MessageSquare,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      border: 'border-indigo-200',
      urgent: false,
    },
    {
      href: '/admin/flags',
      label: 'Flagged Reviews',
      count: flaggedReviewCount ?? 0,
      icon: TriangleAlert,
      color: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-200',
      urgent: (flaggedReviewCount ?? 0) > 3,
    },
  ]

  // Group syncs by source, take the latest per source
  const latestSyncsBySource: Record<string, any> = {}
  for (const s of (recentSyncs ?? [])) {
    if (!latestSyncsBySource[s.source]) latestSyncsBySource[s.source] = s
  }
  const dataSources = Object.values(latestSyncsBySource)

  const hasDataErrors = dataSources.some((s: any) => s.status === 'failed' || s.error_message)

  return (
    <div className="p-4 sm:p-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Platform overview and moderation queue</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`h-2.5 w-2.5 rounded-full ${hasDataErrors ? 'bg-red-500' : 'bg-teal-500'} animate-pulse`} />
          <span className={`text-sm font-medium ${hasDataErrors ? 'text-red-600' : 'text-teal-700'}`}>
            {hasDataErrors ? 'Data errors detected' : 'All systems healthy'}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {/* Total Reviews */}
        <Card className="lg:col-span-2 border-navy-100">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-9 w-9 rounded-lg bg-navy-50 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-navy-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{totalReviews.toLocaleString()}</div>
                <div className="text-xs text-gray-500">Total Reviews</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-100">
              <div className="text-center">
                <div className="text-lg font-bold text-amber-600">{(pendingReviews ?? 0).toLocaleString()}</div>
                <div className="text-xs text-gray-500">Pending</div>
              </div>
              <div className="text-center border-x border-gray-100">
                <div className="text-lg font-bold text-teal-600">{(approvedReviews ?? 0).toLocaleString()}</div>
                <div className="text-xs text-gray-500">Approved</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-red-500">{(rejectedReviews ?? 0).toLocaleString()}</div>
                <div className="text-xs text-gray-500">Rejected</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-100">
          <CardContent className="p-5 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{(totalLandlords ?? 0).toLocaleString()}</div>
              <div className="text-xs text-gray-500">Total Landlords</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-100">
          <CardContent className="p-5 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
              <Users className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{(totalUsers ?? 0).toLocaleString()}</div>
              <div className="text-xs text-gray-500">Total Users</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-100">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-9 w-9 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0">
                <Activity className="h-5 w-5 text-teal-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{(totalWatchlists ?? 0).toLocaleString()}</div>
                <div className="text-xs text-gray-500">Active Watchlists</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Public Records stat — full width bar */}
      <div className="mb-8 p-4 rounded-xl bg-navy-900 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Database className="h-5 w-5 text-teal-400" />
          <div>
            <span className="font-semibold text-white">{(totalPublicRecords ?? 0).toLocaleString()}</span>
            <span className="text-navy-200 text-sm ml-2">public records indexed</span>
          </div>
        </div>
        <Link href="/admin/data-sync" className="text-teal-400 hover:text-teal-300 text-sm flex items-center gap-1">
          Manage data sources <RefreshCw className="h-3.5 w-3.5 ml-1" />
        </Link>
      </div>

      {/* Action Queues */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {queues.map(({ href, label, count, icon: Icon, color, bg, border, urgent }) => (
          <Link key={href} href={href}>
            <Card className={`border ${border} ${bg} hover:shadow-md transition-[transform,box-shadow] duration-200 cursor-pointer hover:-translate-y-0.5`}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <Icon className={`h-5 w-5 ${color}`} />
                  {urgent && (
                    <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">Urgent</Badge>
                  )}
                  {!urgent && count > 0 && (
                    <div className={`h-2 w-2 rounded-full ${color.replace('text-', 'bg-')}`} />
                  )}
                  {count === 0 && (
                    <div className="h-2 w-2 rounded-full bg-teal-400" />
                  )}
                </div>
                <div className={`text-3xl font-bold ${color}`}>{count}</div>
                <div className="text-sm text-gray-600 mt-1">{label}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Pending Landlord Submissions */}
      {(recentPendingSubmissions ?? []).length > 0 && (
        <Card className="mb-6 border-orange-200 bg-orange-50/30">
          <CardHeader className="pb-3 border-b border-orange-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-orange-500" />
                Pending Landlord Submissions
                <Badge className="bg-orange-100 text-orange-800 border-orange-200 text-xs ml-1">
                  {pendingSubmissions} pending
                </Badge>
              </CardTitle>
              <Link href="/admin/submissions" className="text-xs text-navy-600 hover:underline">
                Review all →
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-orange-100">
              {(recentPendingSubmissions ?? []).map((s: any) => (
                <div key={s.id} className="p-4 hover:bg-orange-50/50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900">{s.display_name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {[s.city, s.state_abbr].filter(Boolean).join(', ')}
                        {' · Submitted by '}
                        {(s.submitter as any)?.full_name ?? (s.submitter as any)?.email ?? 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDateRelative(s.created_at)}</p>
                    </div>
                    <Link href="/admin/submissions">
                      <Button size="sm" variant="outline" className="h-7 text-xs border-orange-300 text-orange-700 hover:bg-orange-100">
                        <Eye className="h-3 w-3 mr-1" /> Review
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bottom two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recent Activity — Pending Reviews with inline moderation */}
        <Card className="border-gray-200">
          <CardHeader className="pb-3 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                Recent Activity
                {(pendingReviews ?? 0) > 0 && (
                  <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs ml-1">
                    {pendingReviews} pending
                  </Badge>
                )}
              </CardTitle>
              <Link href="/admin/reviews" className="text-xs text-navy-600 hover:underline">
                View all →
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {(recentPendingReviews ?? []).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                <CheckCircle2 className="h-8 w-8 text-teal-400 mb-2" />
                <p className="text-sm font-medium text-gray-700">Queue is clear</p>
                <p className="text-xs text-gray-400 mt-1">No pending reviews right now</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {(recentPendingReviews ?? []).map((r: any) => (
                  <div key={r.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-gray-900 truncate">{r.title}</p>
                          <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-medium">
                            ★ {r.rating_overall}/5
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{r.body}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-400">
                            {(r.reviewer as any)?.full_name ?? (r.reviewer as any)?.email ?? 'Anonymous'}
                          </span>
                          <span className="text-xs text-gray-300">·</span>
                          <span className="text-xs text-gray-400">{formatDateRelative(r.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link href={`/admin/reviews`}>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs border-gray-200 text-gray-600 hover:bg-gray-100"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Review
                          </Button>
                        </Link>
                      <InlineModerateButton reviewId={r.id} action="approved" />
                      <InlineModerateButton reviewId={r.id} action="rejected" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Data Health */}
        <Card className="border-gray-200">
          <CardHeader className="pb-3 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="h-4 w-4 text-navy-600" />
                Data Health
                {hasDataErrors && (
                  <Badge className="bg-red-100 text-red-700 border-red-200 text-xs ml-1">Needs attention</Badge>
                )}
              </CardTitle>
              <Link href="/admin/data-sync" className="text-xs text-navy-600 hover:underline">
                Manage →
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {dataSources.length === 0 ? (
              <p className="text-sm text-gray-500 p-4">No syncs run yet</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {dataSources.map((s: any) => {
                  const hasError = s.status === 'failed' || !!s.error_message
                  return (
                    <div key={s.id} className="px-4 py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${
                            hasError ? 'bg-red-500' :
                            s.status === 'running' ? 'bg-amber-400 animate-pulse' :
                            'bg-teal-500'
                          }`}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 capitalize">
                            {s.source?.replace(/_/g, ' ')}
                          </p>
                          <p className="text-xs text-gray-400">
                            Last sync {formatDateRelative(s.started_at)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {hasError ? (
                          <div className="flex items-center gap-1 text-red-600">
                            <XCircle className="h-3.5 w-3.5" />
                            <span className="text-xs font-medium">Error</span>
                          </div>
                        ) : (
                          <>
                            <p className="text-xs text-gray-600 font-medium">+{(s.records_added ?? 0).toLocaleString()}</p>
                            <p className="text-xs text-gray-400">{(s.records_updated ?? 0).toLocaleString()} updated</p>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Inline approve/reject — links to the full review queue where moderation works via fetch
function InlineModerateButton({ action }: { reviewId: string; action: 'approved' | 'rejected' }) {
  const isApprove = action === 'approved'
  return (
    <Link
      href="/admin/reviews"
      className={`inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-xs font-medium border transition-colors ${
        isApprove
          ? 'border-teal-300 text-teal-700 hover:bg-teal-50'
          : 'border-red-300 text-red-700 hover:bg-red-50'
      }`}
    >
      {isApprove ? (
        <><CheckCircle2 className="h-3 w-3" /> Approve</>
      ) : (
        <><XCircle className="h-3 w-3" /> Reject</>
      )}
    </Link>
  )
}
