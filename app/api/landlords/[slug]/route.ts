import { NextRequest, NextResponse } from 'next/server'
import { dbError } from '@/lib/api-errors'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  // Public read — landlord rows are exposed to anonymous users on the
  // /landlord/[slug] page anyway. No need to spin up an SSR session.
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('landlords')
    .select('*')
    .eq('slug', slug)
    .single()

  // PGRST116 → real 404. Anything else is a DB failure that should
  // page on-call rather than be masked as 404 — same split applied
  // across the rest of the API surface.
  if (error && error.code !== 'PGRST116') return dbError('landlords/[slug]:get', error)
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ landlord: data })
}
