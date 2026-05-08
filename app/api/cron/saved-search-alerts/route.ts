import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { verifyCronSecret } from '@/lib/data-sync/utils'
import { sendSavedSearchDigestEmail } from '@/lib/email'
import { cityPagePath } from '@/lib/cities'
import { createUnsubscribeToken } from '@/lib/unsubscribe-token'
import { getCityAliases } from '@/lib/cities'
import { canonicalSiteUrl } from '@/lib/canonical-host'
import { captureException } from '@/lib/sentry'

export const maxDuration = 300

type Subscription = {
  id: string
  user_id: string
  city: string
  state_abbr: string
  notify_email: boolean
  last_notified_at: string | null
}

type Reviewer = { id: string; full_name: string | null; email: string | null; email_watchlist: boolean }

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const startedAt = Date.now()

  const { data: log } = await supabase
    .from('sync_log')
    .insert({ source: 'saved_search_alerts', status: 'running', started_at: new Date().toISOString() })
    .select('id')
    .single()
  const logId = log?.id

  // 7-day window, falling back to 8d when a user hasn't been notified yet
  const defaultSince = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: subs, error: subsErr } = await supabase
    .from('saved_searches')
    .select('id, user_id, city, state_abbr, notify_email, last_notified_at')
    .eq('notify_email', true)
    .returns<Subscription[]>()

  // Without this branch a subs-query failure would silently mark the run
  // 'success' below (subs?.length is falsy when subs is null/undefined,
  // which is exactly what an error returns). Now we Sentry-capture and
  // log status='error' so the sync_log + admin dashboard reflect reality.
  if (subsErr) {
    captureException(subsErr, { where: 'cron:saved-search-alerts:select-subs', logId })
    if (logId) {
      await supabase.from('sync_log').update({
        status: 'error',
        finished_at: new Date().toISOString(),
        error_message: subsErr.message,
      }).eq('id', logId)
    }
    return NextResponse.json({ error: 'Failed to load subscriptions' }, { status: 500 })
  }

  if (!subs?.length) {
    if (logId) {
      await supabase.from('sync_log').update({
        status: 'success',
        finished_at: new Date().toISOString(),
        records_updated: 0,
      }).eq('id', logId)
    }
    return NextResponse.json({ ok: true, subscriptions: 0, emailed: 0 })
  }

  let emailed = 0
  const now = new Date().toISOString()

  for (const sub of subs) {
    try {
      const since = sub.last_notified_at && sub.last_notified_at > defaultSince
        ? sub.last_notified_at
        : defaultSince

      // Profile + pref check (email_watchlist acts as the master opt-in for this too).
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('id, full_name, email, email_watchlist')
        .eq('id', sub.user_id)
        .single<Reviewer>()
      // Same fix as the watchlist-alerts cron (b0e8be9). A real DB
      // error here previously read as "profile missing → continue,"
      // silently skipping the digest for that subscriber — they'd
      // never get the email and we wouldn't know why.
      if (profileErr && profileErr.code !== 'PGRST116') {
        captureException(profileErr, { where: 'cron:saved-search-alerts:profile-lookup', subId: sub.id })
      }
      if (!profile?.email || profile.email_watchlist === false) continue

      const rawAliases = getCityAliases(sub.city) ?? [sub.city]
      // Defense-in-depth: strip anything that could break PostgREST filter
      // syntax. Existing rows written before saved-searches sanitize may
      // contain stray commas/colons/parens; drop those chars here too.
      const aliases = rawAliases
        .map(a => a.replace(/[,()*:%"]/g, '').replace(/\s+/g, ' ').trim())
        .filter(a => a.length > 0)
      if (!aliases.length) continue

      // Landlords in this city (multi-alias)
      const orClause = aliases.map(a => `city.ilike.%${a}%`).join(',')
      const { data: landlordRows, error: landlordsErr } = await supabase
        .from('landlords')
        .select('id, display_name, slug, avg_rating, review_count, city')
        .eq('state_abbr', sub.state_abbr)
        .or(orClause)

      if (landlordsErr) {
        captureException(landlordsErr, { where: 'cron:saved-search-alerts:landlord-query', subId: sub.id })
      }
      const landlordIds = (landlordRows ?? []).map(l => l.id)
      if (!landlordIds.length) continue

      // Count new approved reviews in window
      const { count: newReviewCount } = await supabase
        .from('reviews')
        .select('id', { count: 'exact', head: true })
        .in('landlord_id', landlordIds)
        .eq('status', 'approved')
        .gte('created_at', since)

      if (!newReviewCount || newReviewCount === 0) continue

      // Which landlords had the activity
      const { data: activeReviews } = await supabase
        .from('reviews')
        .select('landlord_id')
        .in('landlord_id', landlordIds)
        .eq('status', 'approved')
        .gte('created_at', since)

      const activeIds = new Set((activeReviews ?? []).map(r => r.landlord_id as string))
      const newLandlords = (landlordRows ?? [])
        .filter(l => activeIds.has(l.id))
        .slice(0, 10)
        .map(l => ({
          name: l.display_name as string,
          slug: l.slug as string,
          rating: (l.avg_rating as number | null) ?? null,
          reviewCount: (l.review_count as number | null) ?? 0,
        }))

      const token = createUnsubscribeToken(profile.id)
      const siteUrl = canonicalSiteUrl()
      await sendSavedSearchDigestEmail(profile.email, {
        firstName: profile.full_name?.split(' ')[0],
        city: sub.city,
        stateAbbr: sub.state_abbr,
        cityUrl: `${siteUrl}${cityPagePath(sub.city, sub.state_abbr)}`,
        newReviewCount: newReviewCount ?? 0,
        newLandlords,
        unsubscribeToken: token,
      })

      await supabase
        .from('saved_searches')
        .update({ last_notified_at: now })
        .eq('id', sub.id)

      emailed++
    } catch (err) {
      // Per-subscription failures used to only console.error — so a
      // pattern of failures (e.g. Resend bouncing for one tenant of a
      // multi-tenant deploy) was invisible. Capture each one with the
      // sub id so we can spot the pattern in Sentry.
      console.error(`[saved-search-alerts] failed for ${sub.id}:`, err)
      captureException(err, { where: 'cron:saved-search-alerts:per-sub', subId: sub.id })
    }
  }

  if (logId) {
    await supabase.from('sync_log').update({
      status: 'success',
      finished_at: new Date().toISOString(),
      records_updated: emailed,
    }).eq('id', logId)
  }

  return NextResponse.json({
    ok: true,
    subscriptions: subs.length,
    emailed,
    duration_ms: Date.now() - startedAt,
  })
}
