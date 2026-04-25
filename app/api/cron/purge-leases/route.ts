import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyCronSecret } from '@/lib/data-sync/utils'

export const maxDuration = 60

// GET /api/cron/purge-leases
// Honors Vett's public commitment: "Lease docs: deleted after 30 days, never
// exposed via public API, SHA-256 hash only stored."
//
// Runs daily. Finds every review whose lease_doc_path is older than 30 days,
// removes the storage object, and nulls the path + filename + size on the row.
// Retains lease_hash for dedup and lease_verified / lease_verified_at for
// audit (we lose the doc, not the record that verification happened).
export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  // 1000 per run is more than enough headroom; we run daily so the queue
  // never builds up. If the queue ever does hit the cap, the next run
  // picks up the next batch — natural backpressure.
  const { data: rows, error } = await service
    .from('reviews')
    .select('id, lease_doc_path, created_at')
    .lt('created_at', thirtyDaysAgo)
    .not('lease_doc_path', 'is', null)
    .limit(1000)

  if (error) {
    { console.error("[db]", error); return NextResponse.json({ error: "Database error" }, { status: 500 }) }
  }

  if (!rows || rows.length === 0) {
    return NextResponse.json({ ok: true, purged: 0 })
  }

  const paths = rows
    .map(r => r.lease_doc_path)
    .filter((p): p is string => typeof p === 'string' && p.length > 0)

  // Remove from storage in one call — Supabase accepts up to 1000 paths per remove().
  const { error: removeErr } = await service.storage.from('lease-docs').remove(paths)
  if (removeErr) {
    console.error('[purge-leases] storage remove failed:', removeErr)
    // Continue anyway — null the columns so we don't try to re-delete missing
    // objects forever. The hash + verification audit remain on the row.
  }

  const { error: updateErr } = await service
    .from('reviews')
    .update({
      lease_doc_path: null,
      lease_filename: null,
      lease_file_size: null,
    })
    .in('id', rows.map(r => r.id))

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message, purged: 0 }, { status: 500 })
  }

  return NextResponse.json({ ok: true, purged: rows.length, batch_cap: 1000 })
}
