import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('reviews')
    .select('*, reviewer:profiles(full_name, avatar_url), landlord:landlords(display_name, slug), property:properties(address_line1, city, state_abbr), evidence:review_evidence(*)')
    .eq('id', id)
    .eq('status', 'approved')
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ review: data })
}

const flagSchema = z.object({
  reason: z.enum(['fake', 'defamatory', 'personal_info', 'spam', 'harassment', 'other']),
  note: z.string().max(500).optional(),
})

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = flagSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid' }, { status: 422 })

  const { error } = await supabase.from('review_flags').insert({
    review_id: id,
    flagged_by: user.id,
    reason: parsed.data.reason,
    note: parsed.data.note ?? null,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Increment flag count
  await supabase.rpc('increment_flag_count', { review_id: id })

  return NextResponse.json({ ok: true })
}
