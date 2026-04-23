import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyCronSecret } from '@/lib/data-sync/utils'
import { sendAdminDigestEmail } from '@/lib/email'
import type { AdminDigestCounts } from '@/emails/admin-digest'

export const maxDuration = 60

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  const [
    { count: pendingReviews },
    { count: pendingLeases },
    { count: pendingClaims },
    { count: pendingSubmissions },
    { count: pendingResponses },
    { count: openFlags },
    { count: openDisputes },
  ] = await Promise.all([
    supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('lease_verified', false).not('lease_doc_path', 'is', null),
    supabase.from('landlord_claims').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('landlord_submissions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('landlord_response_status', 'pending').not('landlord_response', 'is', null),
    supabase.from('review_flags').select('*', { count: 'exact', head: true }),
    supabase.from('record_disputes').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
  ])

  const counts: AdminDigestCounts = {
    pendingReviews: pendingReviews ?? 0,
    pendingLeases: pendingLeases ?? 0,
    pendingClaims: pendingClaims ?? 0,
    pendingSubmissions: pendingSubmissions ?? 0,
    pendingResponses: pendingResponses ?? 0,
    openFlags: openFlags ?? 0,
    openDisputes: openDisputes ?? 0,
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0)

  // Only send on days where something is pending, OR on Mondays for the zero-state reassurance.
  // Runtime decides: if total === 0 AND today is not Monday, skip.
  const today = new Date()
  const isMonday = today.getUTCDay() === 1
  if (total === 0 && !isMonday) {
    return NextResponse.json({ ok: true, skipped: 'empty queues, not Monday', counts })
  }

  const { data: admins } = await supabase
    .from('profiles')
    .select('email')
    .eq('user_type', 'admin')
    .eq('is_banned', false)

  const recipients = (admins ?? []).map(a => a.email).filter((e): e is string => Boolean(e))
  if (recipients.length === 0) {
    return NextResponse.json({ ok: true, recipients: 0, counts })
  }

  let sent = 0
  for (const email of recipients) {
    try {
      await sendAdminDigestEmail(email, counts)
      sent++
    } catch (err) {
      console.error('[admin-digest] send failed for', email, err)
    }
  }

  return NextResponse.json({ ok: true, recipients: recipients.length, sent, counts })
}
