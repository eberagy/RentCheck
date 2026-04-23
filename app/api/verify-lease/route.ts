import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { detectFileType, ALLOWED_LEASE_TYPES, MAX_LEASE_SIZE } from '@/lib/utils'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

const schema = z.object({
  reviewId: z.string().uuid().optional(),
  docPath: z.string().min(1).optional(),
  filePath: z.string().min(1).optional(),
  filename: z.string().min(1).optional(),
  fileName: z.string().min(1).optional(),
  fileSize: z.number().int().positive(),
}).transform((value) => ({
  reviewId: value.reviewId,
  docPath: value.docPath ?? value.filePath ?? '',
  filename: value.filename ?? value.fileName ?? '',
  fileSize: value.fileSize,
}))

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = rateLimit(`verify-lease:${user.id}`, 20, 3600_000)
  if (!rl.success) return rateLimitResponse()

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success || !parsed.data.docPath || !parsed.data.filename) {
    return NextResponse.json({ error: 'Invalid lease upload payload' }, { status: 422 })
  }

  const { docPath, filename, fileSize, reviewId } = parsed.data

  // Validate the path belongs to this user
  if (!docPath.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: 'Unauthorized path' }, { status: 403 })
  }

  // Validate file size
  if (fileSize > MAX_LEASE_SIZE) {
    return NextResponse.json({ error: 'File too large' }, { status: 400 })
  }

  // Download first 4 bytes to verify magic bytes
  const { data: fileData, error: downloadError } = await supabase.storage
    .from('lease-docs')
    .download(docPath)

  if (downloadError || !fileData) {
    return NextResponse.json({ error: 'Could not access file' }, { status: 400 })
  }

  const buf = await fileData.arrayBuffer()
  const blob = new Blob([buf])
  const detected = await detectFileType(new File([blob], 'check'))

  if (!detected || !ALLOWED_LEASE_TYPES.includes(detected)) {
    // Delete the invalid file
    await supabase.storage.from('lease-docs').remove([docPath])
    return NextResponse.json({ error: 'Invalid file type. Only PDF, JPG, PNG, and DOCX are accepted.' }, { status: 400 })
  }

  // If reviewId provided, update the review record
  if (reviewId) {
    const { error: updateError } = await supabase
      .from('reviews')
      .update({
        lease_doc_path: docPath,
        lease_filename: filename,
        lease_file_size: fileSize,
        lease_verified: false, // Pending admin review
      })
      .eq('id', reviewId)
      .eq('reviewer_id', user.id)

    if (updateError) return NextResponse.json({ error: 'Failed to update review' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    docPath,
    filename,
    fileSize,
    fileType: detected,
    message: 'Lease uploaded successfully. Your review will stay pending until a founder verifies the document.',
  })
}
