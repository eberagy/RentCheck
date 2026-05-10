import { NextRequest, NextResponse } from 'next/server'
import { assertSameOrigin } from '@/lib/origin'
import { dbError } from '@/lib/api-errors'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { z } from 'zod'
import { sanitizeText } from '@/lib/sanitize'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { sendSubmissionReceivedEmail } from '@/lib/email'
import { PUBLIC_REVIEW_SELECT, stripPrivateReviewFields } from '@/lib/reviews/public'
import { checkReviewContent } from '@/lib/content-filter'
import { captureException } from '@/lib/sentry'

const createSchema = z.object({
  landlordId: z.string().uuid(),
  propertyId: z.string().uuid().optional(),
  propertyAddress: z.string().max(200).optional(),
  ratingOverall: z.number().int().min(1).max(5),
  ratingResponsiveness: z.number().int().min(1).max(5).optional(),
  ratingMaintenance: z.number().int().min(1).max(5).optional(),
  ratingHonesty: z.number().int().min(1).max(5).optional(),
  ratingLeaseFairness: z.number().int().min(1).max(5).optional(),
  wouldRentAgain: z.boolean().nullable().optional(),
  title: z.string().min(10).max(150),
  body: z.string().min(50).max(2000),
  // ISO date strings — explicit length cap so a malicious client can't
  // send a 1MB string through Zod's loose .string() default.
  rentalPeriodStart: z.string().max(40).optional(),
  rentalPeriodEnd: z.string().max(40).optional(),
  isCurrentTenant: z.boolean().default(false),
  // Storage paths and filenames are bounded to prevent DoS via huge
  // metadata strings (the file itself is size-checked at upload time).
  leaseDocPath: z.string().min(1).max(500),
  leaseFilename: z.string().min(1).max(255),
  leaseFileSize: z.number().int().positive(),
  // Privacy-first default: hide the reviewer name + address unless the
  // reviewer explicitly opts in to showing their name on the review.
  isAnonymous: z.boolean().default(true),
})

export async function GET(req: NextRequest) {
  // Public list — only approved reviews are surfaced. No user-scoped
  // filter, so service client is fine.
  const supabase = createServiceClient()
  const { searchParams } = req.nextUrl
  const landlordId = searchParams.get('landlordId')
  const propertyId = searchParams.get('propertyId')
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 50)
  const offset = (page - 1) * limit

  let q = supabase
    .from('reviews')
    .select(PUBLIC_REVIEW_SELECT, { count: 'exact' })
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (landlordId) q = q.eq('landlord_id', landlordId)
  if (propertyId) q = q.eq('property_id', propertyId)

  const { data, error, count } = await q
  if (error) return dbError('reviews:list', error)

  type RawPublicReviewRow = { landlord_response?: string | null; landlord_response_status?: string | null }
  const safe = ((data ?? []) as unknown as RawPublicReviewRow[]).map(r => stripPrivateReviewFields(r))
  return NextResponse.json({ reviews: safe, total: count ?? 0, page, limit })
}

export async function POST(req: NextRequest) {
  const csrf = assertSameOrigin(req)
  if (csrf) return csrf

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('is_banned').eq('id', user.id).single()
  if (profile?.is_banned) return NextResponse.json({ error: 'Account suspended' }, { status: 403 })

  // Rate limit: 5 review submissions per hour per user
  const rl = rateLimit(`reviews:${user.id}`, 5, 3600_000)
  if (!rl.success) return rateLimitResponse(rl)

  const body = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const d = parsed.data

  // Sanitize user-submitted text
  d.title = sanitizeText(d.title)
  d.body = sanitizeText(d.body)
  if (d.propertyAddress) d.propertyAddress = sanitizeText(d.propertyAddress)

  // Convert month strings ("2024-01") to valid DATE ("2024-01-01")
  if (d.rentalPeriodStart && !d.rentalPeriodStart.includes('-', 5)) {
    d.rentalPeriodStart = d.rentalPeriodStart + '-01'
  }
  if (d.rentalPeriodEnd && !d.rentalPeriodEnd.includes('-', 5)) {
    d.rentalPeriodEnd = d.rentalPeriodEnd + '-01'
  }

  if (!d.leaseDocPath.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: 'Lease upload must belong to the signed-in renter' }, { status: 403 })
  }

  // Check for duplicate submission (same user + landlord in last 30
  // days). Without surfacing .error a transient DB hiccup drops
  // existingList to null and slips a duplicate past the dedup. Same
  // pattern fixed in c581dd8 (landlords/submit) and 207f2b1 (flag).
  const { data: existingList, error: existingErr } = await supabase
    .from('reviews')
    .select('id')
    .eq('reviewer_id', user.id)
    .eq('landlord_id', d.landlordId)
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .limit(1)
  if (existingErr) return dbError('reviews:dedup', existingErr)

  if (existingList && existingList.length > 0) return NextResponse.json({ error: 'You recently submitted a review for this landlord' }, { status: 409 })

  // Conservative content-safety tripwire. Slurs / doxxing / explicit threats
  // land in the flagged queue instead of the pending queue so admin sees them
  // first AND they never surface publicly (status='flagged' is hidden by the
  // public select filter).
  const filter = checkReviewContent({ title: d.title, body: d.body })
  const initialStatus = filter.flagged ? 'flagged' : 'pending'
  const adminNote = filter.flagged
    ? `Auto-flagged on submission (reason: ${filter.reason})`
    : null

  const { data: review, error } = await supabase
    .from('reviews')
    .insert({
      reviewer_id: user.id,
      landlord_id: d.landlordId,
      property_id: d.propertyId ?? null,
      property_address: d.propertyAddress ?? null,
      rating_overall: d.ratingOverall,
      rating_responsiveness: d.ratingResponsiveness ?? null,
      rating_maintenance: d.ratingMaintenance ?? null,
      rating_honesty: d.ratingHonesty ?? null,
      rating_lease_fairness: d.ratingLeaseFairness ?? null,
      would_rent_again: d.wouldRentAgain ?? null,
      title: d.title,
      body: d.body,
      rental_period_start: d.rentalPeriodStart ?? null,
      rental_period_end: d.rentalPeriodEnd ?? null,
      is_current_tenant: d.isCurrentTenant,
      lease_doc_path: d.leaseDocPath,
      lease_filename: d.leaseFilename,
      lease_file_size: d.leaseFileSize,
      lease_verified: false,
      is_anonymous: d.isAnonymous,
      status: initialStatus,
      admin_notes: adminNote,
    })
    .select('id')
    .single()

  if (error) return dbError('reviews:insert', error)

  // Non-blocking acknowledgment email
  void (async () => {
    try {
      const service = createServiceClient()
      const [{ data: profile }, { data: landlord }] = await Promise.all([
        service.from('profiles').select('full_name, email').eq('id', user.id).single(),
        service.from('landlords').select('display_name').eq('id', d.landlordId).single(),
      ])
      if (profile?.email) {
        await sendSubmissionReceivedEmail(profile.email, {
          firstName: profile.full_name?.split(' ')[0],
          kind: 'review',
          target: landlord?.display_name,
        })
      }
    } catch (err) {
      // Swallowed throw stays off the response. Capture so we know
      // when reviewers aren't getting their submission ack — same
      // shape as the landlord-response ack fix in 14a546f.
      console.error('[reviews] ack email failed:', err)
      captureException(err, { where: 'reviews:ack' })
    }
  })()

  return NextResponse.json({ reviewId: review.id }, { status: 201 })
}
