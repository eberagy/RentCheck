import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/admin-auth'

export const revalidate = 300 // cache 5 minutes

export async function GET() {
  const supabase = await createClient()
  const user = await requireAdmin(supabase)
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [
    { count: totalUsers },
    { count: totalLandlords },
    { count: totalProperties },
    { count: totalReviews },
    { count: pendingReviews },
    { count: pendingLeases },
    { count: pendingClaims },
    { count: totalRecords },
    { count: openViolations },
    { data: reviewsThisWeek },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('landlords').select('*', { count: 'exact', head: true }),
    supabase.from('properties').select('*', { count: 'exact', head: true }),
    supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('lease_verified', false).not('lease_doc_path', 'is', null),
    supabase.from('landlord_claims').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    // ~360k rows; exact COUNT(*) trips statement timeout. Estimated is fine
    // for a dashboard headline number.
    supabase.from('public_records').select('*', { count: 'estimated', head: true }),
    supabase.from('public_records').select('*', { count: 'estimated', head: true }).not('status', 'in', '("closed","dismissed")'),
    supabase.from('reviews').select('created_at').eq('status', 'approved').gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
  ])

  return NextResponse.json(
    {
      users: totalUsers ?? 0,
      landlords: totalLandlords ?? 0,
      properties: totalProperties ?? 0,
      approvedReviews: totalReviews ?? 0,
      pendingReviews: pendingReviews ?? 0,
      pendingLeases: pendingLeases ?? 0,
      pendingClaims: pendingClaims ?? 0,
      publicRecords: totalRecords ?? 0,
      openViolations: openViolations ?? 0,
      reviewsThisWeek: (reviewsThisWeek ?? []).length,
    },
    // Admin-only dashboard counts — keep stale numbers from drifting
    // into a public CDN. Defense-in-depth no-store across all admin
    // GETs after 095a7dd.
    { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
  )
}
