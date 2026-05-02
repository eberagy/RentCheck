import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyCronSecret } from '@/lib/data-sync/utils'

// Refresh the city_stats cache so /city/[state]/[city] pages can serve
// record counts from a sub-ms lookup instead of running the 1-20s
// count_city_records RPC on every cold-cache visit.
//
// Schedule: nightly at 13:30 UTC. Vercel function cap is 5 min; the
// underlying refresh_city_stats() walks ~200 cities calling
// count_city_records per city, fits comfortably under that.
export const maxDuration = 300

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const startedAt = Date.now()
  const service = createServiceClient()

  const { error } = await service.rpc('refresh_city_stats')
  if (error) {
    console.error('[refresh-city-stats] failed:', error.message)
    return NextResponse.json({ error: 'Refresh failed' }, { status: 500 })
  }

  const { count } = await service
    .from('city_stats')
    .select('city', { count: 'exact', head: true })

  return NextResponse.json({
    ok: true,
    rows: count ?? 0,
    duration_ms: Date.now() - startedAt,
  })
}
