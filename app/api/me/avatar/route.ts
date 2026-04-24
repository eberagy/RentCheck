import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const maxDuration = 30

const MAX_FILE_BYTES = 5 * 1024 * 1024 // 5 MB raw upload
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'])

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const rl = rateLimit(`avatar:${user.id}`, 10, 3600_000)
  if (!rl.success) return rateLimitResponse()

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid multipart body' }, { status: 400 })
  }

  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 422 })
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: 'File too large (max 5 MB)' }, { status: 422 })
  }
  if (file.type && !ALLOWED_MIME.has(file.type)) {
    return NextResponse.json({ error: 'Unsupported image type' }, { status: 422 })
  }

  const buf = Buffer.from(await file.arrayBuffer())

  // Square, center-cropped, web-optimized webp. Strips EXIF.
  let processed: Buffer
  try {
    processed = await sharp(buf)
      .rotate()
      .resize(512, 512, { fit: 'cover', position: 'attention' })
      .webp({ quality: 82 })
      .toBuffer()
  } catch {
    return NextResponse.json({ error: 'Could not process image' }, { status: 422 })
  }

  const service = createServiceClient()
  const key = `${user.id}/${Date.now()}.webp`

  const { error: uploadErr } = await service.storage
    .from('avatars')
    .upload(key, processed, { contentType: 'image/webp', upsert: false, cacheControl: '3600' })

  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 })

  const { data: pub } = service.storage.from('avatars').getPublicUrl(key)
  const avatarUrl = pub.publicUrl

  // Best-effort: remove prior avatars so the user's bucket folder doesn't grow forever.
  const { data: prior } = await service.storage.from('avatars').list(user.id, { limit: 20 })
  const stale = (prior ?? [])
    .map(o => `${user.id}/${o.name}`)
    .filter(p => p !== key)
  if (stale.length) await service.storage.from('avatars').remove(stale)

  const { error: updateErr } = await service
    .from('profiles')
    .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  return NextResponse.json({ ok: true, avatarUrl })
}

export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const service = createServiceClient()
  const { data: prior } = await service.storage.from('avatars').list(user.id, { limit: 50 })
  const keys = (prior ?? []).map(o => `${user.id}/${o.name}`)
  if (keys.length) await service.storage.from('avatars').remove(keys)

  const { error } = await service
    .from('profiles')
    .update({ avatar_url: null, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
