import { NextRequest, NextResponse } from 'next/server'
import { assertSameOrigin } from '@/lib/origin'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { detectFileType, ALLOWED_LEASE_TYPES, MAX_LEASE_SIZE } from '@/lib/utils'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { captureException } from '@/lib/sentry'

const schema = z.object({
  reviewId: z.string().uuid().optional(),
  // Bound storage paths and filenames so a malicious payload can't
  // smuggle a 1MB string through .string()'s default unbounded shape.
  docPath: z.string().min(1).max(500).optional(),
  filePath: z.string().min(1).max(500).optional(),
  filename: z.string().min(1).max(255).optional(),
  fileName: z.string().min(1).max(255).optional(),
  fileSize: z.number().int().positive(),
}).transform((value) => ({
  reviewId: value.reviewId,
  docPath: value.docPath ?? value.filePath ?? '',
  filename: value.filename ?? value.fileName ?? '',
  fileSize: value.fileSize,
}))

export async function POST(req: NextRequest) {
  const csrf = assertSameOrigin(req)
  if (csrf) return csrf

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = rateLimit(`verify-lease:${user.id}`, 20, 3600_000)
  if (!rl.success) return rateLimitResponse(rl)

  const body = await req.json().catch(() => null)
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
    // 400 is the right user-facing status (the file the client uploaded
    // can't be read), but the cause might be a real Supabase Storage
    // outage on our side, in which case every lease verification breaks.
    // Worth capturing distinctly from "user uploaded garbage."
    if (downloadError) captureException(downloadError, { where: 'verify-lease:download' })
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

    if (updateError) {
      captureException(updateError, { where: 'verify-lease:review-update' })
      return NextResponse.json({ error: 'Failed to update review' }, { status: 500 })
    }
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
