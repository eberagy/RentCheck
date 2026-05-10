import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MyReviewsClient, type MyReviewItem } from './MyReviewsClient'
import { captureException } from '@/lib/sentry'

export const metadata: Metadata = {
  title: 'My reviews',
  robots: { index: false, follow: false },
}

export default async function MyReviewsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const params = await searchParams
  const statusFilter = params.status ?? 'all'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirectTo=/dashboard/reviews')

  let q = supabase
    .from('reviews')
    .select('id, title, body, status, rating_overall, rating_responsiveness, rating_maintenance, rating_honesty, rating_lease_fairness, would_rent_again, is_current_tenant, lease_verified, created_at, admin_notes, landlord:landlords(display_name, slug, city, state_abbr)')
    .eq('reviewer_id', user.id)
    .order('created_at', { ascending: false })
  if (statusFilter !== 'all') q = q.eq('status', statusFilter)
  // 200 is far above any realistic per-user review history. Without a
  // bound, a runaway client or an unusual super-prolific reviewer could
  // pull thousands of rows on every dashboard render.
  const { data, error } = await q.limit(200)

  // Same rationale as /dashboard/watchlist — query failure would render
  // the user's reviews list as 'no reviews yet,' looking like a brand-new
  // account. Capture so we know about transient failures.
  if (error) captureException(error, { where: 'dashboard:my-reviews', userId: user.id, statusFilter })

  const reviews = (data ?? []) as unknown as MyReviewItem[]
  return <MyReviewsClient reviews={reviews} statusFilter={statusFilter} />
}
