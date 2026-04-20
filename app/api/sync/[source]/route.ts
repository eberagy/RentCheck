import { NextRequest, NextResponse } from 'next/server'
import { verifyCronSecret, withSyncLog } from '@/lib/data-sync/utils'
import { syncNycHpd } from '@/lib/data-sync/nyc-hpd'
import { syncNycDob } from '@/lib/data-sync/nyc-dob'
import { syncNycRegistration } from '@/lib/data-sync/nyc-registration'
import { syncNyc311 } from '@/lib/data-sync/nyc-311'
import { syncChicago } from '@/lib/data-sync/chicago'
import { syncSf } from '@/lib/data-sync/sf'
import { syncBoston } from '@/lib/data-sync/boston'
import { syncPhiladelphia } from '@/lib/data-sync/philadelphia'
import { syncAustin } from '@/lib/data-sync/austin'
import { syncSeattle } from '@/lib/data-sync/seattle'
import { syncLosAngeles } from '@/lib/data-sync/los-angeles'
import { syncCourtListener } from '@/lib/data-sync/court-listener'
import { syncLscEvictions } from '@/lib/data-sync/lsc-evictions'
import { syncPittsburgh } from '@/lib/data-sync/pittsburgh'
import { syncBaltimore } from '@/lib/data-sync/baltimore'
import { syncHouston } from '@/lib/data-sync/houston'
import { syncMiami } from '@/lib/data-sync/miami'
import { syncDenver } from '@/lib/data-sync/denver'
import { syncDallas } from '@/lib/data-sync/dallas'
import { syncDC } from '@/lib/data-sync/dc'
import { syncAtlanta } from '@/lib/data-sync/atlanta'
import { syncNashville } from '@/lib/data-sync/nashville'
// New cities
import { syncPhoenix } from '@/lib/data-sync/phoenix'
import { syncMinneapolis } from '@/lib/data-sync/minneapolis'
import { syncPortland } from '@/lib/data-sync/portland'
import { syncSanAntonio } from '@/lib/data-sync/san-antonio'
import { syncDetroit } from '@/lib/data-sync/detroit'
import { syncCharlotte } from '@/lib/data-sync/charlotte'
import { syncColumbus } from '@/lib/data-sync/columbus'
import { syncHudInspections } from '@/lib/data-sync/hud-inspections'
import type { SupabaseClient } from '@supabase/supabase-js'

type SyncFn = (supabase: SupabaseClient) => Promise<{ added: number; updated: number; skipped: number; errors: string[] }>

const SYNC_HANDLERS: Record<string, { fn: SyncFn; logKey: string }> = {
  // NYC
  'nyc-hpd':          { fn: syncNycHpd, logKey: 'nyc_hpd' },
  'nyc-dob':          { fn: syncNycDob, logKey: 'nyc_dob' },
  'nyc-registration': { fn: syncNycRegistration, logKey: 'nyc_registration' },
  'nyc-311':          { fn: syncNyc311, logKey: 'nyc_311' },
  // Original cities
  'chicago':          { fn: syncChicago, logKey: 'chicago_buildings' },
  'sf':               { fn: syncSf, logKey: 'sf_housing' },
  'boston':           { fn: syncBoston, logKey: 'boston_isd' },
  'philadelphia':     { fn: syncPhiladelphia, logKey: 'philly_li' },
  'austin':           { fn: syncAustin, logKey: 'austin_code' },
  'seattle':          { fn: syncSeattle, logKey: 'seattle_sdci' },
  'los-angeles':      { fn: syncLosAngeles, logKey: 'la_lahd' },
  'pittsburgh':       { fn: syncPittsburgh, logKey: 'pittsburgh_pli' },
  'baltimore':        { fn: syncBaltimore, logKey: 'baltimore_vacants' },
  'houston':          { fn: syncHouston, logKey: 'houston_code' },
  'miami':            { fn: syncMiami, logKey: 'miami_dade' },
  'denver':           { fn: syncDenver, logKey: 'denver_code' },
  'dallas':           { fn: syncDallas, logKey: 'dallas_code' },
  'dc':               { fn: syncDC, logKey: 'dc_dcra' },
  'atlanta':          { fn: syncAtlanta, logKey: 'atlanta_permits' },
  'nashville':        { fn: syncNashville, logKey: 'nashville_code' },
  // New cities
  'phoenix':          { fn: syncPhoenix, logKey: 'phoenix_code' },
  'minneapolis':      { fn: syncMinneapolis, logKey: 'minneapolis_code' },
  'portland':         { fn: syncPortland, logKey: 'portland_bds' },
  'san-antonio':      { fn: syncSanAntonio, logKey: 'san_antonio_code' },
  'detroit':          { fn: syncDetroit, logKey: 'detroit_blight' },
  'charlotte':        { fn: syncCharlotte, logKey: 'charlotte_code' },
  'columbus':         { fn: syncColumbus, logKey: 'columbus_code' },
  // National / federal
  'court-listener':   { fn: syncCourtListener, logKey: 'court_listener' },
  'lsc-evictions':    { fn: syncLscEvictions, logKey: 'lsc_evictions' },
  'hud-inspections':  { fn: syncHudInspections, logKey: 'hud_reac' },
}

export const maxDuration = 300 // Vercel Pro: 5 min max

export async function GET(req: NextRequest, { params }: { params: { source: string } }) {
  return handleSync(req, (await params).source)
}

export async function POST(req: NextRequest, { params }: { params: { source: string } }) {
  return handleSync(req, (await params).source)
}

async function handleSync(req: NextRequest, source: string) {
  if (!verifyCronSecret(req)) {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data: profile } = await supabase.from('profiles').select('user_type').eq('id', user.id).single()
    if (profile?.user_type !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const handler = SYNC_HANDLERS[source]
  if (!handler) {
    return NextResponse.json(
      { error: `Unknown source: ${source}`, available: Object.keys(SYNC_HANDLERS) },
      { status: 404 }
    )
  }

  try {
    const result = await withSyncLog(handler.logKey, handler.fn)
    return NextResponse.json({ ok: true, source, ...result })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, source, error: msg }, { status: 500 })
  }
}
