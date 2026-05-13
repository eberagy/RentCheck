import { NextRequest, NextResponse } from 'next/server'
import { dbError } from '@/lib/api-errors'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const user = await requireAdmin(supabase)
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Use service client to bypass RLS
  const service = createServiceClient()
  const filter = req.nextUrl.searchParams.get('status') ?? 'pending'

  const q = service
    .from('landlord_submissions')
    .select('id, display_name, business_name, city, state_abbr, zip, website, phone, notes, proof_doc_url, status, admin_notes, created_at, submitted_by, submitter:profiles!landlord_submissions_submitted_by_fkey(full_name, email)')
    .order('created_at', { ascending: true })

  if (filter !== 'all') q.eq('status', filter)

  const { data, error } = await q.limit(50)
  if (error) return dbError('admin/submissions:list', error)

  // Admin queue — contains submitter PII (full names, emails, doc
  // URLs). Defense-in-depth no-store against any future CDN caching.
  return NextResponse.json(
    { submissions: data ?? [] },
    { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
  )
}
