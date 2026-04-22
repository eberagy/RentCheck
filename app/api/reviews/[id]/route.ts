import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('reviews')
    .select('*, reviewer:profiles!reviews_reviewer_id_fkey(full_name, avatar_url), landlord:landlords(display_name, slug), property:properties(address_line1, city, state_abbr), evidence:review_evidence(*)')
    .eq('id', id)
    .eq('status', 'approved')
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ review: data })
}
