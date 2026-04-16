import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  landlordId: z.string().uuid().optional(),
  propertyId: z.string().uuid().optional(),
  notifyEmail: z.boolean().default(true),
}).refine(d => d.landlordId || d.propertyId, { message: 'landlordId or propertyId required' })

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('watchlist')
    .select('*, landlord:landlords(display_name, slug, avg_rating, review_count), property:properties(address_line1, city, state_abbr)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ watchlist: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const landlordId = searchParams.get('landlordId')
  const propertyId = searchParams.get('propertyId')

  let q = supabase.from('watchlist').delete().eq('user_id', user.id)
  if (landlordId) q = q.eq('landlord_id', landlordId)
  if (propertyId) q = q.eq('property_id', propertyId)

  const { error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
