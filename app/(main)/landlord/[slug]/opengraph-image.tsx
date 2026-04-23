import { ImageResponse } from 'next/og'
import { createServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'Landlord profile on Vett — lease-verified reviews and public records'

export default async function OgImage({ params }: { params: { slug: string } }) {
  const p = await params
  const supabase = createServiceClient()

  const { data: landlord } = await supabase
    .from('landlords')
    .select('display_name, city, state_abbr, avg_rating, review_count, open_violation_count, is_verified')
    .eq('slug', p.slug)
    .single()

  const name = landlord?.display_name ?? 'Landlord on Vett'
  const location = [landlord?.city, landlord?.state_abbr].filter(Boolean).join(', ')
  const reviewCount = landlord?.review_count ?? 0
  const avgRating = landlord?.avg_rating ?? 0
  const openViolations = landlord?.open_violation_count ?? 0
  const isVerified = landlord?.is_verified ?? false

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
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#ffffff',
          fontFamily: 'Georgia, serif',
          padding: '72px',
        }}
      >
        {/* Brand + eyebrow */}
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
              Know before you rent
            </span>
          </div>
        </div>

        {/* Landlord name + location */}
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 40 }}>
          <div
            style={{
              fontSize: 76,
              fontWeight: 700,
              lineHeight: 1.02,
              letterSpacing: '-2px',
              maxWidth: 1000,
              display: 'flex',
            }}
          >
            {name}
          </div>
          {location && (
            <div style={{ fontSize: 26, color: '#94a3b8', marginTop: 18, display: 'flex' }}>
              {location}
            </div>
          )}
        </div>

        {/* Metric row */}
        <div
          style={{
            display: 'flex',
            gap: 56,
            marginTop: 56,
            paddingTop: 32,
            borderTop: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {hasReviews ? (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <span style={{ fontSize: 56, fontWeight: 800, color: '#ffffff' }}>{rating}</span>
                <span style={{ fontSize: 22, color: '#94a3b8' }}>/ 5</span>
              </div>
              <span style={{ fontSize: 14, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: 4 }}>
                Avg renter rating
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 56, fontWeight: 800, color: '#ffffff' }}>
                New
              </span>
              <span style={{ fontSize: 14, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: 4 }}>
                Profile
              </span>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 56, fontWeight: 800, color: '#ffffff' }}>{reviewCount}</span>
            <span style={{ fontSize: 14, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: 4 }}>
              Lease-verified reviews
            </span>
          </div>

          {openViolations > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 56, fontWeight: 800, color: '#f87171' }}>{openViolations}</span>
              <span style={{ fontSize: 14, color: '#fca5a5', textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: 4 }}>
                Open public violations
              </span>
            </div>
          )}

          {isVerified && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: '#0f7b6c',
                padding: '10px 18px',
                borderRadius: 10,
                alignSelf: 'flex-start',
                marginTop: 10,
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.06em' }}>VERIFIED LANDLORD</span>
            </div>
          )}
        </div>
      </div>
    ),
    size,
  )
}
