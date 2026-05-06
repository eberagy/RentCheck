import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
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

  // Log this run into sync_log so /admin/data-sync surfaces watchlist-alerts
  // health alongside the data sources.
  const { data: log } = await supabase
    .from('sync_log')
    .insert({ source: 'watchlist_alerts', status: 'running', started_at: new Date().toISOString() })
    .select('id')
    .single()
  const logId = log?.id

  // Get public records added since last run, grouped by landlord.
  // Two paths: (1) records with landlord_id set directly, (2) records
  // linked via a property whose landlord_id is set. Most of our 400k+
  // records are property-linked only — watchers would have missed those
  // alerts before.
  const INFORMATIONAL_TYPES = ['business_registration']

  const [{ data: directRecords }, { data: propertyLinked }] = await Promise.all([
    supabase
      .from('public_records')
      .select('id, landlord_id, record_type, description, title')
      .not('landlord_id', 'is', null)
      .not('record_type', 'in', `(${INFORMATIONAL_TYPES.map(t => `"${t}"`).join(',')})`)
      .gte('created_at', since)
      .order('created_at', { ascending: false }),
    // Records joined through their property's landlord_id. property_id is
    // selected so property-watch entries can also be alerted (post-2026-05-02
    // WatchlistButton supports property-only watches).
    supabase
      .from('public_records')
      .select('id, property_id, record_type, description, title, properties:property_id (landlord_id)')
      .not('property_id', 'is', null)
      .is('landlord_id', null)
      .not('record_type', 'in', `(${INFORMATIONAL_TYPES.map(t => `"${t}"`).join(',')})`)
      .gte('created_at', since)
      .order('created_at', { ascending: false }),
  ])

  type RecAlert = {
    record_type: string | null
    description: string | null
    title: string | null
  }
  const newByLandlord = new Map<string, RecAlert>()
  const newByProperty = new Map<string, RecAlert>()

  for (const r of directRecords ?? []) {
    if (r.landlord_id && !newByLandlord.has(r.landlord_id as string)) {
      newByLandlord.set(r.landlord_id as string, { record_type: r.record_type, description: r.description, title: r.title })
    }
  }
  // propertyLinked rows have a `property_id` and the joined property's
  // landlord_id (may be null). Track by both: property_id for property-watchers,
  // landlord_id (when present) for landlord-watchers who'd otherwise miss it.
  for (const r of propertyLinked ?? []) {
    const propId = (r as unknown as { property_id?: string }).property_id
    const lid = (r.properties as unknown as { landlord_id: string | null } | null)?.landlord_id
    if (propId && !newByProperty.has(propId)) {
      newByProperty.set(propId, { record_type: r.record_type, description: r.description, title: r.title })
    }
    if (lid && !newByLandlord.has(lid)) {
      newByLandlord.set(lid, { record_type: r.record_type, description: r.description, title: r.title })
    }
  }

  if (!newByLandlord.size && !newByProperty.size) {
    if (logId) {
      await supabase.from('sync_log').update({
        status: 'success',
        finished_at: new Date().toISOString(),
        records_added: 0,
      }).eq('id', logId)
    }
    return NextResponse.json({ ok: true, alerts: 0 })
  }

  // Helper to derive the email alert type from the record_type.
  const alertType = (rt: string | null): string => {
    return rt?.includes('eviction') || rt?.includes('court') ? 'new_court_case' : 'new_violation'
  }

  // Combined map keyed by landlord_id (legacy shape).
  const byLandlord = new Map<string, { type: string; summary: string }>()
  for (const [landlordId, info] of Array.from(newByLandlord)) {
    byLandlord.set(landlordId, {
      type: alertType(info.record_type),
      summary: info.title ?? info.description ?? 'A new public record was added',
    })
  }

  let alertsSent = 0

  // Landlord-watch alerts.
  for (const [landlordId, info] of Array.from(byLandlord)) {
    const { data: landlord } = await supabase
      .from('landlords')
      .select('display_name, slug')
      .eq('id', landlordId)
      .single()

    if (!landlord) continue

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

  // Property-watch alerts. WatchlistButton was made polymorphic in
  // commit 529825a; without this loop, property-watchers never get email
  // even when a new violation lands at their watched address.
  for (const [propertyId, info] of Array.from(newByProperty)) {
    const { data: property } = await supabase
      .from('properties')
      .select('id, address_line1, city, state_abbr, landlord:landlords(display_name, slug)')
      .eq('id', propertyId)
      .single()

    if (!property) continue
    const landlordRel = (property.landlord as unknown as { display_name: string; slug: string } | null)

    // Email template links to `/landlord/{slug}` only — skip property-watch
    // alerts when the property hasn't been attributed to a landlord yet.
    // (Once mine-violation-owners attributes the property, the next cron
    // run picks up the same record via the landlord-id branch.)
    if (!landlordRel) continue

    const { data: watchers } = await supabase
      .from('watchlist')
      .select('user_id, notify_email, user:profiles(full_name, email, email_watchlist)')
      .eq('property_id', propertyId)

    if (!watchers?.length) continue

    const addressLabel = `${property.address_line1}, ${property.city}, ${property.state_abbr}`
    for (const watcher of watchers) {
      const profile = (watcher.user as unknown) as { full_name: string | null; email: string | null; email_watchlist: boolean } | null
      if (!profile?.email || profile.email_watchlist === false || watcher.notify_email === false) continue

      await sendWatchlistAlertEmail(profile.email, {
        firstName: profile.full_name?.split(' ')[0],
        landlordName: landlordRel.display_name,
        landlordSlug: landlordRel.slug,
        alertType: alertType(info.record_type) as 'new_review' | 'new_violation' | 'new_court_case',
        summary: info.title ?? info.description ?? `A new public record was added at ${addressLabel}`,
        unsubscribeToken: createUnsubscribeToken(watcher.user_id as string),
      })
      alertsSent++
    }
  }

  if (logId) {
    await supabase.from('sync_log').update({
      status: 'success',
      finished_at: new Date().toISOString(),
      records_added: alertsSent,
    }).eq('id', logId)
  }

  return NextResponse.json({
    ok: true,
    landlords: byLandlord.size,
    properties: newByProperty.size,
    alerts: alertsSent,
  })
}
