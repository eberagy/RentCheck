import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const querySchema = z.object({
  landlordId: z.string().uuid().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
})

export async function GET(req: NextRequest) {
  const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid params' }, { status: 400 })

  const { landlordId, city, state, zip, page, limit } = parsed.data
  const offset = (page - 1) * limit
  const supabase = await createClient()

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
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ properties: data ?? [], total: count ?? 0, page, limit })
}
