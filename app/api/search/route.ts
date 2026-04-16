import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  q: z.string().min(2).max(200),
  type: z.enum(['all', 'landlord', 'property']).default('all'),
  limit: z.coerce.number().min(1).max(50).default(10),
})

export async function GET(req: NextRequest) {
  const parsed = schema.safeParse(Object.fromEntries(req.nextUrl.searchParams))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid query' }, { status: 400 })

  const { q, type, limit } = parsed.data
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('search_all', { query: q, result_limit: limit })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const results = (data ?? []).filter((r: any) => type === 'all' || r.result_type === type)

  return NextResponse.json({ results, query: q })
}
