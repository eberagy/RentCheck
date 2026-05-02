import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { z } from 'zod'

const createSchema = z.object({
  city: z.string().min(1).max(120),
  stateAbbr: z.string().length(2),
  notifyEmail: z.boolean().optional().default(true),
})

// PostgREST .or()/.ilike() filter syntax is comma-separated and uses dots,
// parens, and colons as delimiters. City names we recognize contain only
// letters, spaces, hyphens, apostrophes, and periods (e.g. "St. Louis").
// Strip anything that could break the filter string when interpolated.
function sanitizeCity(raw: string): string {
  return raw
    .trim()
    .replace(/[,()*:%"]/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 120)
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const rl = rateLimit(`saved-searches-get:${user.id}`, 120, 60_000)
  if (!rl.success) return rateLimitResponse()

  const service = createServiceClient()
  const { data, error } = await service
    .from('saved_searches')
    .select('id, city, state_abbr, notify_email, last_notified_at, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) { console.error("[db]", error); return NextResponse.json({ error: "Database error" }, { status: 500 }) }
  return NextResponse.json({ searches: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const rl = rateLimit(`saved-searches:${user.id}`, 30, 3600_000)
  if (!rl.success) return rateLimitResponse()

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 422 })

  const city = sanitizeCity(parsed.data.city)
  const stateAbbr = parsed.data.stateAbbr.toUpperCase()
  if (!city) return NextResponse.json({ error: 'City required' }, { status: 422 })
  if (!/^[A-Z]{2}$/.test(stateAbbr)) return NextResponse.json({ error: 'Invalid state' }, { status: 422 })

  const service = createServiceClient()

  const { count } = await service
    .from('saved_searches')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
  if ((count ?? 0) >= 25) {
    return NextResponse.json({ error: 'Limit reached (25 saved searches).' }, { status: 422 })
  }

  const { data, error } = await service
    .from('saved_searches')
    .upsert(
      {
        user_id: user.id,
        city,
        state_abbr: stateAbbr,
        notify_email: parsed.data.notifyEmail,
      },
      { onConflict: 'user_id,city,state_abbr' },
    )
    .select('id, city, state_abbr, notify_email, created_at')
    .single()

  if (error) { console.error("[db]", error); return NextResponse.json({ error: "Database error" }, { status: 500 }) }
  return NextResponse.json({ search: data })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const url = new URL(req.url)
  const id = url.searchParams.get('id') ?? ''
  const uuid = z.string().uuid().safeParse(id)
  if (!uuid.success) return NextResponse.json({ error: 'Invalid id' }, { status: 422 })

  const service = createServiceClient()
  const { error } = await service
    .from('saved_searches')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) { console.error("[db]", error); return NextResponse.json({ error: "Database error" }, { status: 500 }) }
  return NextResponse.json({ ok: true })
}
