import { NextRequest, NextResponse } from 'next/server'
import { assertSameOrigin } from '@/lib/origin'
import { dbError } from '@/lib/api-errors'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sanitizeText } from '@/lib/sanitize'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { PUBLIC_REVIEW_SELECT, stripPrivateReviewFields } from '@/lib/reviews/public'
import { z } from 'zod'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = await params
  // Public read — only `status='approved'` rows are returned. No
  // user-scoped logic, so service client.
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('reviews')
    .select(`${PUBLIC_REVIEW_SELECT}, landlord:landlords(display_name, slug)`)
    .eq('id', id)
    .eq('status', 'approved')
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  type ReviewWithLandlord = { landlord_response?: string | null; landlord_response_status?: string | null }
  return NextResponse.json({ review: stripPrivateReviewFields(data as unknown as ReviewWithLandlord) })
}

const patchSchema = z.object({
  title: z.string().min(10).max(150).optional(),
  body: z.string().min(50).max(2000).optional(),
  ratingOverall: z.number().int().min(1).max(5).optional(),
  ratingResponsiveness: z.number().int().min(1).max(5).nullable().optional(),
  ratingMaintenance: z.number().int().min(1).max(5).nullable().optional(),
  ratingHonesty: z.number().int().min(1).max(5).nullable().optional(),
  ratingLeaseFairness: z.number().int().min(1).max(5).nullable().optional(),
  wouldRentAgain: z.boolean().nullable().optional(),
  isCurrentTenant: z.boolean().optional(),
})

async function assertOwnerOfPending(reviewId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Not signed in' }, { status: 401 }) as NextResponse }

  const { data: profile } = await supabase.from('profiles').select('is_banned').eq('id', user.id).single()
  if (profile?.is_banned) return { error: NextResponse.json({ error: 'Account suspended' }, { status: 403 }) as NextResponse }

  const service = createServiceClient()
  const { data: review } = await service
    .from('reviews')
    .select('id, reviewer_id, status, lease_doc_path')
    .eq('id', reviewId)
    .single()
  if (!review) return { error: NextResponse.json({ error: 'Review not found' }, { status: 404 }) as NextResponse }
  if (review.reviewer_id !== user.id) return { error: NextResponse.json({ error: 'Not yours to edit' }, { status: 403 }) as NextResponse }
  if (review.status !== 'pending') return { error: NextResponse.json({ error: 'Only pending reviews can be edited' }, { status: 409 }) as NextResponse }

  return { user, service, review }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const csrf = assertSameOrigin(req)
  if (csrf) return csrf

  const { id } = await params
  const gate = await assertOwnerOfPending(id)
  if ('error' in gate) return gate.error
  const { service, user } = gate

  const rl = rateLimit(`review-edit:${user.id}`, 30, 3600_000)
  if (!rl.success) return rateLimitResponse(rl)

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const d = parsed.data
  const updates: Record<string, unknown> = {}
  if (d.title !== undefined) updates.title = sanitizeText(d.title)
  if (d.body !== undefined) updates.body = sanitizeText(d.body)
  if (d.ratingOverall !== undefined) updates.rating_overall = d.ratingOverall
  if (d.ratingResponsiveness !== undefined) updates.rating_responsiveness = d.ratingResponsiveness
  if (d.ratingMaintenance !== undefined) updates.rating_maintenance = d.ratingMaintenance
  if (d.ratingHonesty !== undefined) updates.rating_honesty = d.ratingHonesty
  if (d.ratingLeaseFairness !== undefined) updates.rating_lease_fairness = d.ratingLeaseFairness
  if (d.wouldRentAgain !== undefined) updates.would_rent_again = d.wouldRentAgain
  if (d.isCurrentTenant !== undefined) updates.is_current_tenant = d.isCurrentTenant

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 422 })
  }

  const { error } = await service.from('reviews').update(updates).eq('id', id)
  if (error) return dbError('reviews/[id]:patch', error)
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const csrf = assertSameOrigin(req)
  if (csrf) return csrf

  const { id } = await params
  const gate = await assertOwnerOfPending(id)
  if ('error' in gate) return gate.error
  const { service, review, user } = gate

  const rl = rateLimit(`review-delete:${user.id}`, 10, 3600_000)
  if (!rl.success) return rateLimitResponse(rl)

  const leasePath = review.lease_doc_path
  const ownerId = review.reviewer_id

  const { error } = await service.from('reviews').delete().eq('id', id)
  if (error) return dbError('reviews/[id]:delete', error)

  // Best-effort: remove the stored lease doc since it was never verified.
  void (async () => {
    try {
      if (leasePath?.startsWith(`${ownerId}/`)) {
        await service.storage.from('lease-docs').remove([leasePath])
      }
    } catch (err) {
      console.error('[reviews DELETE] storage cleanup failed:', err)
    }
  })()

  return NextResponse.json({ ok: true })
}
