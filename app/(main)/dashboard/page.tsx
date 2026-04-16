import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { FileText, Eye, Star, Plus, ArrowRight, Settings, CheckCircle2, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { formatDate } from '@/lib/utils'

export const metadata: Metadata = { title: 'Dashboard | RentCheck' }

const STATUS_STYLES: Record<string, string> = {
  approved: 'text-teal-700 border-teal-200 bg-teal-50',
  rejected: 'text-red-700 border-red-200 bg-red-50',
  pending: 'text-amber-700 border-amber-200 bg-amber-50',
  flagged: 'text-orange-700 border-orange-200 bg-orange-50',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirectTo=/dashboard')

  const [
    { data: profile },
    { data: reviews },
    { data: watchlist },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase
      .from('reviews')
      .select('id, title, status, rating_overall, created_at, lease_verified, landlord:landlords(display_name, slug)')
      .eq('reviewer_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('watchlist')
      .select('id, created_at, landlord:landlords(display_name, slug, avg_rating, review_count, open_violation_count)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const reviewList = reviews ?? []
  const watchList = watchlist ?? []

  const stats = [
    {
      label: 'Reviews Submitted',
      value: reviewList.length,
      icon: FileText,
      iconBg: 'bg-navy-50',
      iconColor: 'text-navy-600',
    },
    {
      label: 'Watchlist',
      value: watchList.length,
      icon: Eye,
      iconBg: 'bg-teal-50',
      iconColor: 'text-teal-600',
    },
    {
      label: 'Verified Reviews',
      value: reviewList.filter((r: any) => r.lease_verified).length,
      icon: Star,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
    },
  ]

  const firstName = profile?.full_name?.split(' ')[0] ?? null

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8 flex-wrap">
        <Avatar className="h-14 w-14 ring-2 ring-navy-100">
          <AvatarImage src={profile?.avatar_url ?? undefined} />
          <AvatarFallback className="bg-navy-100 text-navy-700 font-bold text-lg">
            {profile?.full_name?.charAt(0) ?? user.email?.charAt(0)?.toUpperCase() ?? 'R'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900">
            {firstName ? `Welcome back, ${firstName}` : 'Your Dashboard'}
          </h1>
          <p className="text-sm text-gray-500 truncate">{user.email}</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button asChild size="sm" variant="outline">
            <Link href="/dashboard/settings">
              <Settings className="h-4 w-4 mr-1.5" /> Settings
            </Link>
          </Button>
          <Button asChild size="sm" className="bg-navy-500 hover:bg-navy-600 text-white">
            <Link href="/review/new">
              <Plus className="h-4 w-4 mr-1.5" /> Write a Review
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, iconBg, iconColor }) => (
          <Card key={label} className="border-gray-200">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`h-5 w-5 ${iconColor}`} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900 leading-none">{value}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{label}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* My Reviews */}
        <Card className="border-gray-200">
          <CardHeader className="pb-3 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">My Reviews</CardTitle>
              <Link href="/review/new" className="text-xs text-navy-600 hover:text-navy-800 flex items-center gap-0.5 font-medium">
                <Plus className="h-3 w-3" /> New <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {reviewList.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <FileText className="h-8 w-8 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-600">No reviews yet.</p>
                <Link href="/review/new" className="text-xs text-navy-600 hover:underline mt-1 inline-block font-medium">
                  Write your first review →
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {reviewList.map((r: any) => {
                  const landlord = r.landlord as any
                  return (
                    <Link
                      key={r.id}
                      href={landlord?.slug ? `/landlord/${landlord.slug}` : '#'}
                      className="flex items-start justify-between gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{r.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                          {landlord?.display_name ?? 'Unknown Landlord'}
                          {' · '}{'★'.repeat(r.rating_overall)}{'☆'.repeat(5 - r.rating_overall)}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">{formatDate(r.created_at)}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        <Badge className={`text-xs border capitalize ${STATUS_STYLES[r.status] ?? 'text-gray-500 border-gray-200'}`}>
                          {r.status}
                        </Badge>
                        {r.lease_verified && (
                          <span className="inline-flex items-center gap-0.5 text-xs text-teal-600 font-medium">
                            <CheckCircle2 className="h-3 w-3" /> Verified
                          </span>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Watchlist */}
        <Card className="border-gray-200">
          <CardHeader className="pb-3 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Watchlist</CardTitle>
              <Link href="/search" className="text-xs text-navy-600 hover:text-navy-800 font-medium flex items-center gap-0.5">
                Browse <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {watchList.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Eye className="h-8 w-8 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-600">No landlords watched yet.</p>
                <p className="text-xs text-gray-400 mt-1">Visit a landlord page and click "Watch Landlord".</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {watchList.map((w: any) => {
                  const landlord = w.landlord as any
                  if (!landlord) return null
                  return (
                    <Link
                      key={w.id}
                      href={`/landlord/${landlord.slug}`}
                      className="flex items-start justify-between gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{landlord.display_name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          ★ {landlord.avg_rating?.toFixed(1) ?? '—'} · {landlord.review_count} review{landlord.review_count !== 1 ? 's' : ''}
                        </p>
                      </div>
                      {landlord.open_violation_count > 0 && (
                        <span className="flex items-center gap-1 text-xs text-red-600 font-medium flex-shrink-0">
                          <AlertTriangle className="h-3 w-3" />
                          {landlord.open_violation_count}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Onboarding nudge if no reviews */}
      {reviewList.length === 0 && watchList.length === 0 && (
        <div className="mt-6 bg-navy-50 border border-navy-100 rounded-xl p-5 text-center">
          <h3 className="font-semibold text-navy-900 mb-1">Get started with RentCheck</h3>
          <p className="text-sm text-navy-700 mb-4">Share your rental experience to help fellow renters</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Button asChild size="sm" className="bg-navy-500 hover:bg-navy-600 text-white">
              <Link href="/review/new">Write a Review</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/search">Search Landlords</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
