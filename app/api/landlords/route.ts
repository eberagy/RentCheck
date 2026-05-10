import { NextRequest, NextResponse } from 'next/server'
import { dbError } from '@/lib/api-errors'
import { createServiceClient } from '@/lib/supabase/service'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { z } from 'zod'

const querySchema = z.object({
  id: z.string().uuid().optional(),
  // Caps prevent unbounded ilike '%...%' scans on Postgres. Real city
  // names max around 30 chars; 100 leaves headroom for hyphenated
  // multi-word inputs without enabling DoS via 10MB strings.
  city: z.string().max(100).optional(),
  state: z.string().max(2).optional(),
  minRating: z.coerce.number().min(1).max(5).optional(),
  verified: z.coerce.boolean().optional(),
  page: z.coerce.number().min(1).max(500).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
})

export async function GET(req: NextRequest) {
  // IP-based rate limit — public read but the count + filter combo
  // forces a Postgres scan of the landlords table for each call.
  // 60/min/IP keeps it accessible for legit tooling without enabling
  // a tight loop to DoS the DB.
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? 'anon'
  const rl = rateLimit(`landlords-list:${ip}`, 60, 60_000)
  if (!rl.success) return rateLimitResponse(rl)

  const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid params' }, { status: 400 })

  const { id, city, state, minRating, verified, page, limit } = parsed.data
  const offset = (page - 1) * limit
  // Public list endpoint — same data as the search page surfaces. No
  // user-scoped filtering, so service client is appropriate.
  const supabase = createServiceClient()

  if (id) {
    const { data, error } = await supabase
      .from('landlords')
      .select('id, slug, display_name, business_name, city, state_abbr, avg_rating, review_count, is_verified, is_claimed, open_violation_count, response_rate')
      .eq('id', id)
      .single()

    // Same PGRST116 split as the rest of the API. Public read but
    // the by-id route is consumed by ReviewForm's preselect lookup —
    // a real DB error showing as 404 there told the user "Landlord
    // not found" right after they clicked through from a working
    // landlord page.
    if (error && error.code !== 'PGRST116') return dbError('landlords:by-id', error)
    if (!data) return NextResponse.json({ error: 'Landlord not found' }, { status: 404 })
    return NextResponse.json(
      { landlord: data },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } },
    )
  }

  let q = supabase
    .from('landlords')
    .select('id, slug, display_name, business_name, city, state_abbr, avg_rating, review_count, is_verified, is_claimed, open_violation_count, response_rate', { count: 'exact' })
    .order('review_count', { ascending: false })
    .range(offset, offset + limit - 1)

  if (city) q = q.ilike('city', `%${city}%`)
  if (state) q = q.eq('state_abbr', state.toUpperCase())
  if (minRating) q = q.gte('avg_rating', minRating)
  if (verified !== undefined) q = q.eq('is_verified', verified)

  const { data, error, count } = await q
  if (error) return dbError('landlords:list', error)

  // Public filtered list — keyed by city/state/minRating/verified/page.
  // Same caching shape as the by-id branch above; the URL varies on
  // all filter params so different filter combos cache independently.
  return NextResponse.json(
    { landlords: data ?? [], total: count ?? 0, page, limit },
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } },
  )
}
