import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  const { slug } = await params
  // Public read — landlord rows are exposed to anonymous users on the
  // /landlord/[slug] page anyway. No need to spin up an SSR session.
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('landlords')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ landlord: data })
}
