import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { FileText, Eye, Star, Plus, ArrowRight, Settings, CheckCircle2, AlertTriangle, Edit, Sparkles, Building2, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Stars } from '@/components/vett/Stars'
import { Chip } from '@/components/vett/Chip'
import { Grade } from '@/components/vett/Grade'
import { getGradeLetter } from '@/lib/grade'
import { formatDate } from '@/lib/utils'

export const metadata: Metadata = { title: 'Dashboard | Vett' }

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
    { data: submissions },
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
    supabase
      .from('landlord_submissions')
      .select('id, display_name, city, state_abbr, status, created_at, landlord_id')
      .eq('submitted_by', user.id)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const reviewList = reviews ?? []
  const watchList = watchlist ?? []
  const submissionList = submissions ?? []
  const verifiedCount = reviewList.filter((r: any) => r.lease_verified).length
  const firstName = profile?.full_name?.split(' ')[0] ?? null

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero strip */}
      <section className="relative overflow-hidden bg-[linear-gradient(135deg,#0d1728,#07111f)] px-7 py-10 text-white">
        <div className="absolute right-[-40px] top-[-20px] h-[200px] w-[200px] rounded-full bg-teal/30 blur-[80px]" />
        <div className="relative mx-auto flex max-w-[1180px] items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-teal-300">Your dashboard</div>
            <h1 className="mt-2 text-[36px] font-extrabold tracking-tight">
              {firstName ? `Welcome back, ${firstName}.` : 'Your Dashboard'}
            </h1>
            <p className="mt-1.5 text-[14px] text-slate-400">
              {watchList.length} watchlist items &middot; {reviewList.length} reviews &middot; {verifiedCount} verified
            </p>
          </div>
          <Button asChild className="rounded-full bg-teal px-5 hover:bg-teal-500 text-white">
            <Link href="/review/new"><Edit className="mr-1.5 h-3.5 w-3.5" /> Write a review</Link>
          </Button>
        </div>
      </section>

      <div className="mx-auto grid max-w-[1180px] gap-6 px-7 py-7 lg:grid-cols-[1fr_320px]">
        <div className="grid gap-5">
          {/* Watchlist panel */}
          <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[16px] font-bold text-slate-900">
                Your watchlist <span className="font-normal text-slate-400">&middot; {watchList.length}</span>
              </h3>
              <Link href="/search" className="text-[12.5px] text-slate-500 hover:text-slate-700">Manage &rarr;</Link>
            </div>
            {watchList.length === 0 ? (
              <div className="py-10 text-center">
                <Eye className="mx-auto mb-3 h-8 w-8 text-slate-200" />
                <p className="text-sm text-slate-600">No landlords watched yet.</p>
                <p className="mt-1 text-[12.5px] text-slate-400">Visit a landlord page and click &ldquo;Watch Landlord&rdquo;.</p>
              </div>
            ) : (
              <div className="grid gap-2.5">
                {watchList.map((w: any) => {
                  const landlord = w.landlord as any
                  if (!landlord) return null
                  const grade = getGradeLetter(landlord.avg_rating)
                  return (
                    <Link
                      key={w.id}
                      href={`/landlord/${landlord.slug}`}
                      className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 rounded-[16px] border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300"
                    >
                      <Grade letter={grade} size="sm" />
                      <div className="min-w-0">
                        <div className="truncate text-[14px] font-bold text-slate-900">{landlord.display_name}</div>
                        <div className="mt-0.5 text-[12px] text-slate-500">{landlord.review_count} reviews</div>
                      </div>
                      {landlord.open_violation_count > 0 ? (
                        <Chip tone="rose">{landlord.open_violation_count} open violations</Chip>
                      ) : (
                        <Chip tone="neutral">No changes</Chip>
                      )}
                      <div className="flex items-center gap-2">
                        <Stars value={landlord.avg_rating ?? 0} size={12} />
                        <span className="text-[13px] font-bold">{landlord.avg_rating?.toFixed(1) ?? '—'}</span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* Reviews panel */}
          <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[16px] font-bold text-slate-900">
                Your reviews <span className="font-normal text-slate-400">&middot; {reviewList.length}</span>
              </h3>
              <Link href="/review/new" className="text-[12.5px] text-slate-500 hover:text-slate-700">Write new &rarr;</Link>
            </div>
            {reviewList.length === 0 ? (
              <div className="py-10 text-center">
                <FileText className="mx-auto mb-3 h-8 w-8 text-slate-200" />
                <p className="text-sm text-slate-600">No reviews yet.</p>
                <Link href="/review/new" className="mt-1 inline-block text-[12.5px] font-medium text-teal hover:underline">
                  Write your first review &rarr;
                </Link>
              </div>
            ) : (
              <div className="grid gap-1">
                {reviewList.map((r: any, i: number) => {
                  const landlord = r.landlord as any
                  return (
                    <Link
                      key={r.id}
                      href={landlord?.slug ? `/landlord/${landlord.slug}` : '#'}
                      className={`grid grid-cols-[auto_1fr_auto] items-center gap-3 py-3 px-1 ${i < reviewList.length - 1 ? 'border-b border-slate-100' : ''}`}
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
                        <Star className={`h-3 w-3 ${r.lease_verified ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-bold text-slate-900">{r.title}</p>
                        <p className="mt-0.5 text-[12px] text-slate-500 truncate">
                          {landlord?.display_name ?? 'Unknown'} &middot; {formatDate(r.created_at)}
                        </p>
                      </div>
                      <Badge className={`text-[11px] border capitalize ${STATUS_STYLES[r.status] ?? 'text-slate-500 border-slate-200'}`}>
                        {r.status}
                      </Badge>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
          {/* Landlord Submissions panel */}
          {submissionList.length > 0 && (
            <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-[16px] font-bold text-slate-900">
                  Submitted landlords <span className="font-normal text-slate-400">&middot; {submissionList.length}</span>
                </h3>
                <Link href="/add-landlord" className="text-[12.5px] text-slate-500 hover:text-slate-700">Submit new &rarr;</Link>
              </div>
              <div className="grid gap-1">
                {submissionList.map((s: any, i: number) => (
                  <div
                    key={s.id}
                    className={`grid grid-cols-[auto_1fr_auto] items-center gap-3 py-3 px-1 ${i < submissionList.length - 1 ? 'border-b border-slate-100' : ''}`}
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
                      {s.status === 'approved' ? (
                        <CheckCircle2 className="h-3 w-3 text-teal-500" />
                      ) : s.status === 'rejected' ? (
                        <AlertTriangle className="h-3 w-3 text-red-400" />
                      ) : (
                        <Clock className="h-3 w-3 text-amber-500" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-bold text-slate-900">{s.display_name}</p>
                      <p className="mt-0.5 text-[12px] text-slate-500 truncate">
                        {[s.city, s.state_abbr].filter(Boolean).join(', ')} &middot; {formatDate(s.created_at)}
                      </p>
                    </div>
                    <Badge className={`text-[11px] border capitalize ${STATUS_STYLES[s.status] ?? 'text-slate-500 border-slate-200'}`}>
                      {s.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="grid gap-4 self-start">
          {/* Rights tip */}
          <div className="rounded-xl border border-teal-200 bg-gradient-to-br from-teal-50 to-slate-50 p-5">
            <Sparkles className="h-[18px] w-[18px] text-teal" />
            <div className="mt-3 text-[15px] font-bold text-slate-900">Know your rights.</div>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-teal-900">
              Most states require deposits to be returned within 30 days, with an itemized list of deductions.
            </p>
            <Link href="/rights" className="mt-2.5 inline-flex items-center gap-1 text-[12.5px] font-semibold text-teal-900 hover:underline">
              Read the guide <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {/* Account settings */}
          <div className="rounded-xl border border-slate-200 bg-white p-[18px]">
            <div className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Account</div>
            <div className="grid gap-2">
              <Link href="/dashboard/settings" className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 text-[13px] text-slate-700 hover:bg-slate-100 transition-colors">
                <span>Account settings</span>
                <Settings className="h-3.5 w-3.5 text-slate-400" />
              </Link>
              <Link href="/search" className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 text-[13px] text-slate-700 hover:bg-slate-100 transition-colors">
                <span>Search landlords</span>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
