import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Lightweight liveness/readiness check for uptime monitors. Returns 200 when:
//   - The server is reachable (it answered)
//   - Supabase is reachable (one trivial count query succeeds)
// Returns 503 if Supabase is unreachable. The body always includes a
// "ok" boolean and a server timestamp for debugging.
export async function GET() {
  const startedAt = Date.now()
  let supabaseOk = false
  let supabaseLatencyMs: number | null = null
  let supabaseError: string | null = null

  try {
    const t0 = Date.now()
    const service = createServiceClient()
    const { error } = await service
      .from('landlords')
      .select('id', { head: true, count: 'estimated' })
      .limit(1)
    supabaseLatencyMs = Date.now() - t0
    if (error) supabaseError = 'query_error'
    else supabaseOk = true
  } catch {
    supabaseError = 'connect_error'
  }

  const body = {
    ok: supabaseOk,
    timestamp: new Date().toISOString(),
    uptime_ms: Date.now() - startedAt,
    supabase: {
      ok: supabaseOk,
      latency_ms: supabaseLatencyMs,
      error: supabaseError,
    },
    region: process.env.VERCEL_REGION ?? 'local',
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'dev',
  }

  return NextResponse.json(body, {
    status: supabaseOk ? 200 : 503,
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  })
}
