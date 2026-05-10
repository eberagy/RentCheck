import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { verifyCronSecret } from '@/lib/data-sync/utils'
import { captureException } from '@/lib/sentry'

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
  const startedAt = Date.now()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data: log, error: logErr } = await service
    .from('sync_log')
    .insert({ source: 'purge_leases', status: 'running', started_at: new Date().toISOString() })
    .select('id')
    .single()
  if (logErr) captureException(logErr, { where: 'cron:purge-leases:log-insert' })
  const logId = log?.id

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
    console.error("[db]", error)
    captureException(error, { where: 'cron:purge-leases:select', logId })
    if (logId) {
      await service.from('sync_log').update({
        status: 'error',
        finished_at: new Date().toISOString(),
        error_message: error.message,
      }).eq('id', logId)
    }
    return NextResponse.json({ error: "Database error" }, { status: 500 })
  }

  if (!rows || rows.length === 0) {
    if (logId) {
      await service.from('sync_log').update({
        status: 'success',
        finished_at: new Date().toISOString(),
        records_updated: 0,
      }).eq('id', logId)
    }
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
    // But surface to Sentry: orphaned storage objects accumulate cost
    // and cross retention-policy boundaries that a console-only error
    // never paged.
    captureException(removeErr, { where: 'cron:purge-leases:storage-remove', pathCount: paths.length })
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
    console.error('[cron/purge-leases] update failed:', updateErr.message)
    captureException(updateErr, { where: 'cron:purge-leases:update', logId, rowCount: rows.length })
    if (logId) {
      await service.from('sync_log').update({
        status: 'error',
        finished_at: new Date().toISOString(),
        error_message: updateErr.message,
      }).eq('id', logId)
    }
    return NextResponse.json({ error: 'Database error', purged: 0 }, { status: 500 })
  }

  if (logId) {
    await service.from('sync_log').update({
      status: 'success',
      finished_at: new Date().toISOString(),
      records_updated: rows.length,
    }).eq('id', logId)
  }

  return NextResponse.json({
    ok: true,
    purged: rows.length,
    batch_cap: 1000,
    duration_ms: Date.now() - startedAt,
  })
}
