import { NextRequest, NextResponse } from 'next/server'
import { assertSameOrigin } from '@/lib/origin'
import { dbError } from '@/lib/api-errors'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { z } from 'zod'

const schema = z.object({
  landlordId: z.string().uuid().optional(),
  propertyId: z.string().uuid().optional(),
  notifyEmail: z.boolean().default(true),
}).refine(d => d.landlordId || d.propertyId, { message: 'landlordId or propertyId required' })

export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Bound the join. Same cap as /dashboard/watchlist — 200 entries is
  // far above any realistic watchlist size.
  const { data, error } = await supabase
    .from('watchlist')
    .select('*, landlord:landlords(display_name, slug, avg_rating, review_count), property:properties(address_line1, city, state_abbr)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(200)

  // Without this check a query failure would silently render the user's
  // watchlist as empty — they'd see "no watchlist entries" and assume
  // their data was deleted. dbError surfaces 500 + Sentry capture so
  // we know within minutes instead of via "where did my watchlist go"
  // support emails.
  if (error) return dbError('watchlist:list', error)

  return NextResponse.json({ watchlist: data ?? [] })
}

export async function POST(req: NextRequest) {
  const csrf = assertSameOrigin(req)
  if (csrf) return csrf

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = rateLimit(`watchlist-add:${user.id}`, 60, 3600_000)
  if (!rl.success) return rateLimitResponse(rl)

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid' }, { status: 422 })

  const { landlordId, propertyId, notifyEmail } = parsed.data
  const onConflict = landlordId ? 'user_id,landlord_id' : 'user_id,property_id'

  const { error } = await supabase.from('watchlist').upsert({
    user_id: user.id,
    landlord_id: landlordId ?? null,
    property_id: propertyId ?? null,
    notify_email: notifyEmail,
  }, { onConflict })

  if (error) return dbError('watchlist:upsert', error)
  return NextResponse.json({ ok: true }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const csrf = assertSameOrigin(req)
  if (csrf) return csrf

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const landlordId = searchParams.get('landlordId')
  const propertyId = searchParams.get('propertyId')

  // Without one of these the delete becomes WHERE user_id = X with no
  // further filter — wiping the user's entire watchlist. Reject as 422
  // instead. UUID-shape is enforced by the .eq() round-trip; a bad
  // value just won't match and produces "0 rows deleted" silently.
  if (!landlordId && !propertyId) {
    return NextResponse.json({ error: 'landlordId or propertyId required' }, { status: 422 })
  }
  const idSchema = z.string().uuid()
  if (landlordId && !idSchema.safeParse(landlordId).success) {
    return NextResponse.json({ error: 'Invalid landlordId' }, { status: 422 })
  }
  if (propertyId && !idSchema.safeParse(propertyId).success) {
    return NextResponse.json({ error: 'Invalid propertyId' }, { status: 422 })
  }

  let q = supabase.from('watchlist').delete().eq('user_id', user.id)
  if (landlordId) q = q.eq('landlord_id', landlordId)
  if (propertyId) q = q.eq('property_id', propertyId)

  const { error } = await q
  if (error) return dbError('watchlist:delete', error)
  return NextResponse.json({ ok: true })
}
