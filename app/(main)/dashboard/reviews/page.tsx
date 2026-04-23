import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MyReviewsClient, type MyReviewItem } from './MyReviewsClient'

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
  const { data } = await q

  const reviews = (data ?? []) as unknown as MyReviewItem[]
  return <MyReviewsClient reviews={reviews} statusFilter={statusFilter} />
}
