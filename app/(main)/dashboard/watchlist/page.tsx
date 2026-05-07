import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { WatchlistClient, type WatchlistRow } from './WatchlistClient'
import { captureException } from '@/lib/sentry'

export const metadata: Metadata = {
  title: 'My watchlist',
  robots: { index: false, follow: false },
}

export default async function WatchlistPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirectTo=/dashboard/watchlist')

  const { data, error } = await supabase
    .from('watchlist')
    .select('id, created_at, notify_email, landlord:landlords(id, slug, display_name, business_name, city, state_abbr, avg_rating, review_count, open_violation_count, eviction_count, is_verified)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // Without this a query failure would render the same 'no watched
  // landlords' empty state as a real empty watchlist — users would
  // think their watchlist got wiped. Page still renders gracefully on
  // failure.
  if (error) captureException(error, { where: 'dashboard:watchlist', userId: user.id })

  const rows = (data ?? []) as unknown as WatchlistRow[]
  return <WatchlistClient rows={rows} />
}
