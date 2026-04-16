import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const querySchema = z.object({
  city: z.string().optional(),
  state: z.string().optional(),
  minRating: z.coerce.number().min(1).max(5).optional(),
  verified: z.coerce.boolean().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
})

export async function GET(req: NextRequest) {
  const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid params' }, { status: 400 })

  const { city, state, minRating, verified, page, limit } = parsed.data
  const offset = (page - 1) * limit
  const supabase = await createClient()

  let q = supabase
    .from('landlords')
    .select('id, slug, display_name, business_name, city, state_abbr, avg_rating, review_count, grade, is_verified, is_claimed, open_violation_count', { count: 'exact' })
    .order('review_count', { ascending: false })
    .range(offset, offset + limit - 1)

  if (city) q = q.ilike('city', `%${city}%`)
  if (state) q = q.eq('state_abbr', state.toUpperCase())
  if (minRating) q = q.gte('avg_rating', minRating)
  if (verified !== undefined) q = q.eq('is_verified', verified)

  const { data, error, count } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ landlords: data ?? [], total: count ?? 0, page, limit })
}
