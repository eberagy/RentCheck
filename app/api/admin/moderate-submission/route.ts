import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'
import slugify from 'slugify'
import { US_STATES } from '@/types'

const schema = z.object({
  submissionId: z.string().uuid(),
  action: z.enum(['approved', 'rejected', 'duplicate']),
  adminNotes: z.string().max(1000).optional(),
})

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type')
    .eq('id', user.id)
    .single()
  return profile?.user_type === 'admin' ? user : null
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const admin = await requireAdmin(supabase)
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid' }, { status: 422 })

  const { submissionId, action, adminNotes } = parsed.data
  const service = createServiceClient()

  // Get the submission
  const { data: submission } = await service
    .from('landlord_submissions')
    .select('*')
    .eq('id', submissionId)
    .single()

  if (!submission) return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
  if (submission.status !== 'pending') {
    return NextResponse.json({ error: 'Already moderated' }, { status: 409 })
  }

  if (action === 'approved') {
    // Create the landlord entry
    const baseSlug = slugify(submission.display_name, { lower: true, strict: true })
    const stateName = submission.state_abbr
      ? US_STATES.find(s => s.abbr === submission.state_abbr.toUpperCase())?.name ?? null
      : null

    // Retry with different suffix on slug collision
    let newLandlord: { id: string; slug: string } | null = null
    for (let attempt = 0; attempt < 3; attempt++) {
      const suffix = Math.random().toString(36).slice(2, 6)
      const { data, error: insertErr } = await service
        .from('landlords')
        .insert({
          display_name: submission.display_name,
          slug: `${baseSlug}-${suffix}`,
          business_name: submission.business_name,
          city: submission.city,
          state: stateName,
          state_abbr: submission.state_abbr,
          zip: submission.zip,
          website: submission.website,
          phone: submission.phone,
          bio: submission.notes,
        })
        .select('id, slug')
        .single()

      if (!insertErr && data) { newLandlord = data; break }
      if (insertErr && !insertErr.message.includes('duplicate') && !insertErr.message.includes('unique')) {
        return NextResponse.json({ error: insertErr.message }, { status: 500 })
      }
    }

    if (!newLandlord) return NextResponse.json({ error: 'Could not generate unique slug' }, { status: 500 })

    // Update submission with the created landlord reference
    await service
      .from('landlord_submissions')
      .update({
        status: 'approved',
        reviewed_by: admin.id,
        reviewed_at: new Date().toISOString(),
        landlord_id: newLandlord.id,
        admin_notes: adminNotes ?? null,
      })
      .eq('id', submissionId)

    return NextResponse.json({ ok: true, landlordId: newLandlord.id, slug: newLandlord.slug })
  }

  // Rejected or duplicate
  await service
    .from('landlord_submissions')
    .update({
      status: action,
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
      admin_notes: adminNotes ?? null,
    })
    .eq('id', submissionId)

  return NextResponse.json({ ok: true })
}
