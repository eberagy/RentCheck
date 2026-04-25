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
// Additional cities
import { syncMemphis } from '@/lib/data-sync/memphis'
import { syncLouisville } from '@/lib/data-sync/louisville'
import { syncKansasCity } from '@/lib/data-sync/kansas-city'
import { syncIndianapolis } from '@/lib/data-sync/indianapolis'
import { syncStLouis } from '@/lib/data-sync/st-louis'
import { syncNewOrleans } from '@/lib/data-sync/new-orleans'
import { syncSacramento } from '@/lib/data-sync/sacramento'
import { syncSanJose } from '@/lib/data-sync/san-jose'
import { syncCleveland } from '@/lib/data-sync/cleveland'
import { syncRaleigh } from '@/lib/data-sync/raleigh'
// Ownership / landlord sources
import { syncNycPluto } from '@/lib/data-sync/nyc-pluto'
import { syncHudMultifamily } from '@/lib/data-sync/hud-multifamily'
import { syncCookCountyAssessor } from '@/lib/data-sync/cook-county-assessor'
import { syncPhillyOpa } from '@/lib/data-sync/philly-opa'
import { syncBostonAssessing } from '@/lib/data-sync/boston-assessing'
import { syncLaRso } from '@/lib/data-sync/la-rso'
import { syncDcAssessor } from '@/lib/data-sync/dc-assessor'
import { syncMiamiDadeAssessor } from '@/lib/data-sync/miami-dade-assessor'
import { syncDenverAssessor } from '@/lib/data-sync/denver-assessor'
import { syncHarrisCountyAssessor } from '@/lib/data-sync/harris-county-assessor'
import { syncMaricopaAssessor } from '@/lib/data-sync/maricopa-assessor'
import { syncKingCountyAssessor } from '@/lib/data-sync/king-county-assessor'
import { syncSfAssessor } from '@/lib/data-sync/sf-assessor'
import { syncNycHpdRegistration } from '@/lib/data-sync/nyc-hpd-registration'
import { syncAlleghenyAssessor } from '@/lib/data-sync/allegheny-assessor'
import { syncLaCountyAssessor } from '@/lib/data-sync/la-county-assessor'
import { syncCuyahogaAssessor } from '@/lib/data-sync/cuyahoga-assessor'
import { syncWakeCountyAssessor } from '@/lib/data-sync/wake-county-assessor'
import { syncFranklinCountyAssessor } from '@/lib/data-sync/franklin-county-assessor'
import { syncMecklenburgAssessor } from '@/lib/data-sync/mecklenburg-assessor'
import { syncTravisCountyAssessor } from '@/lib/data-sync/travis-county-assessor'
import { syncMineViolationOwners } from '@/lib/data-sync/mine-violation-owners'
import { syncNyCorpRegistry } from '@/lib/data-sync/ny-corp-registry'
import { syncNycEvictions } from '@/lib/data-sync/nyc-evictions'
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
  // Additional cities
  'memphis':          { fn: syncMemphis, logKey: 'memphis_code' },
  'louisville':       { fn: syncLouisville, logKey: 'louisville_code' },
  'kansas-city':      { fn: syncKansasCity, logKey: 'kansas_city_code' },
  'indianapolis':     { fn: syncIndianapolis, logKey: 'indianapolis_code' },
  'st-louis':         { fn: syncStLouis, logKey: 'stlouis_code' },
  'new-orleans':      { fn: syncNewOrleans, logKey: 'new_orleans_code' },
  'sacramento':       { fn: syncSacramento, logKey: 'sacramento_code' },
  'san-jose':         { fn: syncSanJose, logKey: 'san_jose_code' },
  'cleveland':        { fn: syncCleveland, logKey: 'cleveland_code' },
  'raleigh':          { fn: syncRaleigh, logKey: 'raleigh_code' },
  // National / federal
  'court-listener':   { fn: syncCourtListener, logKey: 'court_listener' },
  'lsc-evictions':    { fn: syncLscEvictions, logKey: 'lsc_evictions' },
  'hud-inspections':  { fn: syncHudInspections, logKey: 'hud_reac' },
  // Ownership / landlord databases
  'nyc-pluto':          { fn: syncNycPluto, logKey: 'nyc_pluto' },
  'hud-multifamily':    { fn: syncHudMultifamily, logKey: 'hud_multifamily' },
  'cook-county':        { fn: syncCookCountyAssessor, logKey: 'cook_county_assessor' },
  'philly-opa':         { fn: syncPhillyOpa, logKey: 'philly_opa' },
  'boston-assessing':   { fn: syncBostonAssessing, logKey: 'boston_assessing' },
  'la-rso':             { fn: syncLaRso, logKey: 'la_rso' },
  'dc-assessor':        { fn: syncDcAssessor, logKey: 'dc_assessor' },
  'miami-dade-assessor':{ fn: syncMiamiDadeAssessor, logKey: 'miami_dade_assessor' },
  'denver-assessor':    { fn: syncDenverAssessor, logKey: 'denver_assessor' },
  'harris-county':      { fn: syncHarrisCountyAssessor, logKey: 'harris_county_assessor' },
  'maricopa-assessor':  { fn: syncMaricopaAssessor, logKey: 'maricopa_assessor' },
  'king-county':          { fn: syncKingCountyAssessor, logKey: 'king_county_assessor' },
  'sf-assessor':          { fn: syncSfAssessor, logKey: 'sf_assessor' },
  'nyc-hpd-registration': { fn: syncNycHpdRegistration, logKey: 'nyc_hpd_registration' },
  'allegheny-assessor':   { fn: syncAlleghenyAssessor, logKey: 'allegheny_assessor' },
  'la-county-assessor':   { fn: syncLaCountyAssessor, logKey: 'la_county_assessor' },
  'cuyahoga-assessor':    { fn: syncCuyahogaAssessor, logKey: 'cuyahoga_assessor' },
  'wake-county':          { fn: syncWakeCountyAssessor, logKey: 'wake_county_assessor' },
  'franklin-county':      { fn: syncFranklinCountyAssessor, logKey: 'franklin_county_assessor' },
  'mecklenburg-assessor': { fn: syncMecklenburgAssessor, logKey: 'mecklenburg_assessor' },
  'travis-county':        { fn: syncTravisCountyAssessor, logKey: 'travis_county_assessor' },
  'mine-owners':          { fn: syncMineViolationOwners, logKey: 'mine_violation_owners' },
  'ny-corp-registry':     { fn: syncNyCorpRegistry, logKey: 'ny_dos_corporations' },
  'nyc-evictions':        { fn: syncNycEvictions, logKey: 'nyc_marshals_evictions' },
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
