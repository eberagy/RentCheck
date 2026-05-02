import { ImageResponse } from 'next/og'
import { createServiceClient } from '@/lib/supabase/server'
import { US_STATES } from '@/types'
import { getCityAliases } from '@/lib/cities'

export const runtime = 'nodejs'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'Vett — landlord reviews and public records for this city'

function formatCityName(slug: string) {
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

export default async function OgImage({ params }: { params: { state: string; city: string } }) {
  const p = await params
  const cityName = formatCityName(p.city)
  const stateAbbr = p.state.toUpperCase()
  const stateName = US_STATES.find(s => s.abbr === stateAbbr)?.name ?? stateAbbr

  const supabase = createServiceClient()
  const aliases = getCityAliases(cityName)

  let landlordQuery = supabase
    .from('landlords')
    .select('review_count', { count: 'exact', head: true })
    .eq('state_abbr', stateAbbr)
  const sanitize = (s: string) => s.replace(/[,()*:%"]/g, '').replace(/\s+/g, ' ').trim()
  if (aliases) {
    const safeAliases = aliases.map(sanitize).filter(Boolean)
    if (safeAliases.length) {
      landlordQuery = landlordQuery.or(safeAliases.map(a => `city.ilike.%${a}%`).join(','))
    }
  } else {
    landlordQuery = landlordQuery.ilike('city', `%${sanitize(cityName)}%`)
  }
  const [{ count: landlordCount }, recordsResp] = await Promise.all([
    landlordQuery,
    aliases
      ? supabase.rpc('count_city_records_multi', { city_names: aliases, state_code: stateAbbr })
      : supabase.rpc('count_city_records', { city_name: cityName, state_code: stateAbbr }),
  ])
  const recordCount = Number(recordsResp?.data ?? 0)

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, #07111f 0%, #0c2340 50%, #0f7b6c 180%)',
          color: '#ffffff',
          fontFamily: 'Georgia, serif',
          padding: '72px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 'auto' }}>
          <div
            style={{
              width: 52,
              height: 52,
              background: '#0f7b6c',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 26,
              fontWeight: 900,
              letterSpacing: '-1px',
            }}
          >
            V
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px' }}>Vett</span>
            <span style={{ fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
              {stateAbbr} · {cityName} · {stateName}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 40 }}>
          <div style={{ fontSize: 88, fontWeight: 700, lineHeight: 1.02, letterSpacing: '-2.5px', display: 'flex' }}>
            {cityName}
          </div>
          <div
            style={{
              fontSize: 88,
              fontWeight: 700,
              lineHeight: 1.02,
              letterSpacing: '-2.5px',
              color: '#5eead4',
              display: 'flex',
              fontStyle: 'italic',
            }}
          >
            landlords, vetted.
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 56,
            marginTop: 52,
            paddingTop: 32,
            borderTop: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 54, fontWeight: 800, color: '#ffffff' }}>
              {(landlordCount ?? 0).toLocaleString()}
            </span>
            <span style={{ fontSize: 14, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: 4 }}>
              Landlords tracked
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 54, fontWeight: 800, color: '#ffffff' }}>
              {recordCount.toLocaleString()}
            </span>
            <span style={{ fontSize: 14, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: 4 }}>
              Public records
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 'auto' }}>
            <span style={{ fontSize: 18, color: '#cbd5e1' }}>vettrentals.com</span>
            <span style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>Know before you rent</span>
          </div>
        </div>
      </div>
    ),
    size,
  )
}
