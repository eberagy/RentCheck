import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  display_name: z.string().min(2).max(200),
  business_name: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state_abbr: z.string().length(2).optional(),
  zip: z.string().max(10).optional(),
  website: z.string().url().optional().or(z.literal('')),
  phone: z.string().max(20).optional(),
  notes: z.string().max(1000).optional(),
})

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in to submit a landlord' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid' }, { status: 422 })

  const { display_name, business_name, city, state_abbr, zip, website, phone, notes } = parsed.data

  // Check if landlord already exists (fuzzy — just check ilike)
  const { data: existing } = await supabase
    .from('landlords')
    .select('id, slug')
    .ilike('display_name', display_name)
    .limit(1)
    .single()

  if (existing) {
    return NextResponse.json({ exists: true, slug: existing.slug }, { status: 200 })
  }

  // Check for duplicate pending submission from same user
  const { data: dupe } = await supabase
    .from('landlord_submissions')
    .select('id')
    .eq('submitted_by', user.id)
    .ilike('display_name', display_name)
    .eq('status', 'pending')
    .limit(1)
    .single()

  if (dupe) {
    return NextResponse.json({ pending: true }, { status: 200 })
  }

  const { error } = await supabase.from('landlord_submissions').insert({
    submitted_by: user.id,
    display_name: display_name.trim(),
    business_name: business_name?.trim() || null,
    city: city?.trim() || null,
    state_abbr: state_abbr?.toUpperCase() || null,
    zip: zip?.trim() || null,
    website: website || null,
    phone: phone?.trim() || null,
    notes: notes?.trim() || null,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
