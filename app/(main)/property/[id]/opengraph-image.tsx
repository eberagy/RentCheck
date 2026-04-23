import { ImageResponse } from 'next/og'
import { createServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'Property profile on Vett — renter reviews and public records for this address'

export default async function OgImage({ params }: { params: { id: string } }) {
  const p = await params
  const supabase = createServiceClient()

  const { data: property } = await supabase
    .from('properties')
    .select('address_line1, city, state_abbr, avg_rating, review_count, landlord:landlords(display_name)')
    .eq('id', p.id)
    .single()

  const address = property?.address_line1 ?? 'Property on Vett'
  const location = [property?.city, property?.state_abbr].filter(Boolean).join(', ')
  const reviewCount = property?.review_count ?? 0
  const avgRating = property?.avg_rating ?? 0
  const landlordName = (property?.landlord as unknown as { display_name: string } | null)?.display_name
  const hasReviews = reviewCount > 0
  const rating = hasReviews ? avgRating.toFixed(1) : null

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, #0c2340 0%, #1e293b 60%, #0f172a 100%)',
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
              Property on Vett
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 40 }}>
          <div
            style={{
              fontSize: 66,
              fontWeight: 700,
              lineHeight: 1.03,
              letterSpacing: '-1.6px',
              maxWidth: 1000,
              display: 'flex',
            }}
          >
            {address}
          </div>
          {location && (
            <div style={{ fontSize: 26, color: '#94a3b8', marginTop: 16, display: 'flex' }}>
              {location}
            </div>
          )}
          {landlordName && (
            <div style={{ fontSize: 18, color: '#64748b', marginTop: 8, display: 'flex' }}>
              Managed by {landlordName}
            </div>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            gap: 56,
            marginTop: 48,
            paddingTop: 30,
            borderTop: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {hasReviews ? (
            <>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                  <span style={{ fontSize: 56, fontWeight: 800, color: '#ffffff' }}>{rating}</span>
                  <span style={{ fontSize: 22, color: '#94a3b8' }}>/ 5</span>
                </div>
                <span style={{ fontSize: 14, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: 4 }}>
                  Renter rating
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 56, fontWeight: 800, color: '#ffffff' }}>{reviewCount}</span>
                <span style={{ fontSize: 14, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: 4 }}>
                  Lease-verified reviews
                </span>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 56, fontWeight: 800, color: '#ffffff' }}>Research first</span>
              <span style={{ fontSize: 14, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: 4 }}>
                Public records · Lease-verified reviews
              </span>
            </div>
          )}
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
