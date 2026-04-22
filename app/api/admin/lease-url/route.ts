import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('user_type').eq('id', user.id).single()
  if (profile?.user_type !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const path = req.nextUrl.searchParams.get('path')
  if (!path) return NextResponse.json({ error: 'path required' }, { status: 400 })

  // Use service client — private buckets need service role for signed URLs
  const serviceClient = createServiceClient()
  const { data, error } = await serviceClient.storage.from('lease-docs').createSignedUrl(path, 3600)
  if (error || !data) return NextResponse.json({ error: 'Could not generate URL' }, { status: 500 })

  // Return the URL as JSON so the client can open it
  return NextResponse.json({ signedUrl: data.signedUrl })
}
