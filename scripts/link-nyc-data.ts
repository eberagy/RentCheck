/**
 * Link NYC properties + public records to landlords via HPD registration data.
 *
 * 1. Get distinct registrationids from our public_records
 * 2. Fetch owner names from NYC Open Data for those registrations
 * 3. Match owner names → landlords by display_name
 * 4. For matched registrations: link properties and records via SQL
 *
 * Run: npx tsx scripts/link-nyc-data.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const CONTACTS_API = 'https://data.cityofnewyork.us/resource/feu5-w2e2.json'

function toTitleCase(s: string): string {
  if (!s) return s
  return s === s.toUpperCase()
    ? s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
    : s
}

async function main() {
  console.log('=== NYC Data Linker ===\n')

  // 1. Get all distinct registrationids from public_records
  console.log('1. Fetching registration IDs from DB...')
  const { data: regRows, error: regErr } = await supabase
    .rpc('get_distinct_hpd_regids')

  let regIds: string[]
  if (regErr) {
    // Fallback: query directly
    console.log('   Using direct query fallback...')
    const { data } = await supabase
      .from('public_records')
      .select('raw_data')
      .eq('source', 'nyc_hpd')
      .not('raw_data->registrationid', 'is', null)
      .limit(50000)

    regIds = Array.from(new Set((data ?? []).map((r: any) => r.raw_data?.registrationid).filter(Boolean)))
  } else {
    regIds = (regRows ?? []).map((r: any) => r.registrationid)
  }
  console.log(`   ${regIds.length} distinct registration IDs`)

  // 2. Load our NYC landlords
  console.log('2. Loading NYC landlords...')
  const { data: landlords } = await supabase
    .from('landlords')
    .select('id, display_name')
    .eq('state_abbr', 'NY')

  const landlordByName = new Map<string, string>()
  for (const l of landlords ?? []) {
    landlordByName.set(l.display_name.toLowerCase().trim(), l.id)
  }
  console.log(`   ${landlordByName.size} NYC landlords loaded`)

  // 3. Fetch owner names from NYC Open Data in batches
  console.log('3. Fetching owner names from NYC Open Data API...')
  const regToLandlord = new Map<string, string>() // registrationid -> landlord_id
  const PAGE = 5000

  for (let offset = 0; ; offset += PAGE) {
    const url = `${CONTACTS_API}?$select=registrationid,corporationname` +
      `&$where=type='CorporateOwner'` +
      `&$limit=${PAGE}&$offset=${offset}&$order=registrationid`

    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(30000) })
      if (!res.ok) { console.log(`   HTTP ${res.status} at offset ${offset}`); break }
      const rows: any[] = await res.json()
      if (!Array.isArray(rows) || rows.length === 0) break

      for (const row of rows) {
        const regId = row.registrationid
        const name = row.corporationname?.trim()
        if (!regId || !name) continue

        // Only care about registrations we have in our DB
        if (!regIds.includes(regId)) continue

        const normalized = toTitleCase(name).toLowerCase().trim()
        const landlordId = landlordByName.get(normalized)
        if (landlordId) {
          regToLandlord.set(regId, landlordId)
        }
      }

      if (offset % 20000 === 0) {
        console.log(`   Offset ${offset}, matched ${regToLandlord.size} registrations so far...`)
      }
      if (rows.length < PAGE) break
    } catch (e) {
      console.log(`   Error at offset ${offset}: ${e}`)
      break
    }
  }
  console.log(`   ✓ Matched ${regToLandlord.size} registrations to landlords`)

  if (regToLandlord.size === 0) {
    console.log('   No matches found. Exiting.')
    return
  }

  // 4. Link public_records → landlord_id for matched registrations
  console.log('4. Linking public records to landlords...')
  let recordsLinked = 0
  const entries = Array.from(regToLandlord.entries())

  for (let i = 0; i < entries.length; i += 50) {
    const batch = entries.slice(i, i + 50)
    for (const [regId, landlordId] of batch) {
      const { count } = await supabase
        .from('public_records')
        .update({ landlord_id: landlordId })
        .eq('source', 'nyc_hpd')
        .filter('raw_data->>registrationid', 'eq', regId)
        .is('landlord_id', null)
        .select('*', { count: 'exact', head: true })

      recordsLinked += count ?? 0
    }
    if (i % 200 === 0 && i > 0) {
      console.log(`   ${i}/${entries.length} registrations processed, ${recordsLinked} records linked...`)
    }
  }
  console.log(`   ✓ Linked ${recordsLinked} public records to landlords`)

  // 5. Link properties → landlord_id via the public_records bridge
  console.log('5. Linking properties via public records...')
  const { error: propErr } = await supabase.rpc('link_properties_via_records')

  if (propErr) {
    // Fallback: manual SQL
    console.log('   Using manual property linking...')
    let propsLinked = 0
    for (const [regId, landlordId] of entries) {
      // Find properties linked to public_records with this regId
      const { data: propRecords } = await supabase
        .from('public_records')
        .select('property_id')
        .filter('raw_data->>registrationid', 'eq', regId)
        .not('property_id', 'is', null)
        .limit(100)

      const propIds = [...new Set((propRecords ?? []).map(r => r.property_id).filter(Boolean))]
      for (const propId of propIds) {
        const { error } = await supabase
          .from('properties')
          .update({ landlord_id: landlordId })
          .eq('id', propId)
          .is('landlord_id', null)
        if (!error) propsLinked++
      }
    }
    console.log(`   ✓ Linked ${propsLinked} properties to landlords`)
  } else {
    console.log('   ✓ Properties linked via RPC')
  }

  // 6. Update landlord violation counts
  console.log('6. Updating landlord stats...')
  const { error: statsErr } = await supabase.rpc('update_landlord_violation_counts')
  if (statsErr) {
    // Fallback SQL
    console.log('   Running manual stats update...')
    for (const landlordId of new Set(regToLandlord.values())) {
      const { count: openCount } = await supabase
        .from('public_records')
        .select('*', { count: 'exact', head: true })
        .eq('landlord_id', landlordId)
        .neq('status', 'closed')

      const { count: totalCount } = await supabase
        .from('public_records')
        .select('*', { count: 'exact', head: true })
        .eq('landlord_id', landlordId)

      await supabase.from('landlords').update({
        open_violation_count: openCount ?? 0,
        total_violation_count: totalCount ?? 0,
      }).eq('id', landlordId)
    }
    console.log('   ✓ Stats updated')
  }

  console.log('\n=== Done ===')
}

main().catch(console.error)
