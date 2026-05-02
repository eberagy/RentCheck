import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyCronSecret } from '@/lib/data-sync/utils'
import { sendWatchlistAlertEmail } from '@/lib/email'
import { createUnsubscribeToken } from '@/lib/unsubscribe-token'

export const maxDuration = 60

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const since = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString() // last 25h to avoid gaps

  // Get public records added since last run, grouped by landlord.
  // Skip purely-informational types (LLC filings, etc.) — those should
  // surface on the profile but never trigger an alarming watchlist alert.
  const INFORMATIONAL_TYPES = ['business_registration']
  const { data: newRecords } = await supabase
    .from('public_records')
    .select('id, landlord_id, record_type, description, title')
    .not('landlord_id', 'is', null)
    .not('record_type', 'in', `(${INFORMATIONAL_TYPES.map(t => `"${t}"`).join(',')})`)
    .gte('created_at', since)
    .order('created_at', { ascending: false })

  if (!newRecords?.length) {
    return NextResponse.json({ ok: true, alerts: 0 })
  }

  // Deduplicate by landlord (one alert per landlord per run)
  const byLandlord = new Map<string, { type: string; summary: string }>()
  for (const record of newRecords) {
    if (!record.landlord_id) continue
    if (!byLandlord.has(record.landlord_id)) {
      const isCourtLike = record.record_type?.includes('eviction') || record.record_type?.includes('court')
      byLandlord.set(record.landlord_id, {
        type: isCourtLike ? 'new_court_case' : 'new_violation',
        summary: record.title ?? record.description ?? 'A new public record was added',
      })
    }
  }

  let alertsSent = 0

  for (const [landlordId, info] of Array.from(byLandlord)) {
    // Get landlord info
    const { data: landlord } = await supabase
      .from('landlords')
      .select('display_name, slug')
      .eq('id', landlordId)
      .single()

    if (!landlord) continue

    // Get watchers who have email_watchlist enabled
    const { data: watchers } = await supabase
      .from('watchlist')
      .select('user_id, notify_email, user:profiles(full_name, email, email_watchlist)')
      .eq('landlord_id', landlordId)

    if (!watchers?.length) continue

    for (const watcher of watchers) {
      const profile = (watcher.user as unknown) as { full_name: string | null; email: string | null; email_watchlist: boolean } | null
      if (!profile?.email || profile.email_watchlist === false || watcher.notify_email === false) continue

      await sendWatchlistAlertEmail(profile.email, {
        firstName: profile.full_name?.split(' ')[0],
        landlordName: landlord.display_name,
        landlordSlug: landlord.slug,
        alertType: info.type as 'new_review' | 'new_violation' | 'new_court_case',
        summary: info.summary,
        unsubscribeToken: createUnsubscribeToken(watcher.user_id as string),
      })
      alertsSent++
    }
  }

  return NextResponse.json({ ok: true, landlords: byLandlord.size, alerts: alertsSent })
}
