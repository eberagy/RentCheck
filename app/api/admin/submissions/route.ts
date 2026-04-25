import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  // Verify admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type')
    .eq('id', user.id)
    .single()
  if (profile?.user_type !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Use service client to bypass RLS
  const service = createServiceClient()
  const filter = req.nextUrl.searchParams.get('status') ?? 'pending'

  const q = service
    .from('landlord_submissions')
    .select('id, display_name, business_name, city, state_abbr, zip, website, phone, notes, proof_doc_url, status, admin_notes, created_at, submitted_by, submitter:profiles!landlord_submissions_submitted_by_fkey(full_name, email)')
    .order('created_at', { ascending: true })

  if (filter !== 'all') q.eq('status', filter)

  const { data, error } = await q.limit(50)
  if (error) { console.error("[db]", error); return NextResponse.json({ error: "Database error" }, { status: 500 }) }

  return NextResponse.json({ submissions: data ?? [] })
}
