import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('landlords')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ landlord: data })
}
