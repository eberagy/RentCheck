import { NextRequest, NextResponse } from 'next/server'
import { dbError } from '@/lib/api-errors'
import { createServiceClient } from '@/lib/supabase/service'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { z } from 'zod'

const querySchema = z.object({
  landlordId: z.string().uuid().optional(),
  // Caps prevent unbounded ilike '%...%' on Postgres (parallel hardening
  // to /api/landlords). Real city names max ~30 chars; zip is 5 or 9.
  city: z.string().max(100).optional(),
  state: z.string().max(2).optional(),
  zip: z.string().max(10).optional(),
  page: z.coerce.number().min(1).max(500).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
})

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? 'anon'
  const rl = rateLimit(`properties-list:${ip}`, 60, 60_000)
  if (!rl.success) return rateLimitResponse(rl)

  const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid params' }, { status: 400 })

  const { landlordId, city, state, zip, page, limit } = parsed.data
  const offset = (page - 1) * limit
  // Public read — no user-scoped logic. Service client avoids the cookies()
  // dependency.
  const supabase = createServiceClient()

  let q = supabase
    .from('properties')
    .select('*, landlord:landlords(display_name, slug, is_verified)', { count: 'exact' })
    .order('review_count', { ascending: false })
    .range(offset, offset + limit - 1)

  if (landlordId) q = q.eq('landlord_id', landlordId)
  if (city) q = q.ilike('city', `%${city}%`)
  if (state) q = q.eq('state_abbr', state.toUpperCase())
  if (zip) q = q.eq('zip', zip)

  const { data, error, count } = await q
  if (error) return dbError('properties:list', error)

  return NextResponse.json({ properties: data ?? [], total: count ?? 0, page, limit })
}
