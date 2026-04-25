import { ImageResponse } from 'next/og'
import { createServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'Renter profile on Vett — lease-verified reviews'

export default async function OgImage({ params }: { params: { id: string } }) {
  const p = await params
  const service = createServiceClient()

  const { data: profile } = await service
    .from('profiles')
    .select('full_name, public_profile, is_banned')
    .eq('id', p.id)
    .single()

  // Fall back to a generic Vett card if the profile isn't public.
  const isPublic = profile?.public_profile && !profile?.is_banned
  const name = (isPublic ? profile?.full_name?.trim() : null) || 'Vett reviewer'

  let reviewCount = 0
  let verifiedCount = 0
  if (isPublic) {
    const { data: reviews } = await service
      .from('reviews')
      .select('id, lease_verified')
      .eq('reviewer_id', p.id)
      .eq('status', 'approved')
    reviewCount = reviews?.length ?? 0
    verifiedCount = reviews?.filter(r => r.lease_verified).length ?? 0
  }

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
        {/* Brand */}
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
              Reviews shared publicly
            </span>
          </div>
        </div>

        {/* Reviewer headline */}
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 40 }}>
          <span
            style={{
              fontSize: 22,
              color: '#94a3b8',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              letterSpacing: '0.04em',
            }}
          >
            Reviews by
          </span>
          <span
            style={{
              fontSize: 84,
              fontWeight: 700,
              lineHeight: 1.02,
              letterSpacing: '-2px',
              marginTop: 6,
              maxWidth: 1000,
              display: 'flex',
            }}
          >
            {name}
          </span>
        </div>

        {/* Stats */}
        {isPublic && reviewCount > 0 && (
          <div style={{ display: 'flex', gap: 48, marginTop: 56 }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 64, fontWeight: 800, color: '#5eead4', lineHeight: 1, fontFamily: 'system-ui, sans-serif' }}>
                {reviewCount}
              </span>
              <span
                style={{
                  fontSize: 14,
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  marginTop: 8,
                  fontFamily: 'system-ui, sans-serif',
                }}
              >
                Reviews
              </span>
            </div>
            {verifiedCount > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 64, fontWeight: 800, color: '#5eead4', lineHeight: 1, fontFamily: 'system-ui, sans-serif' }}>
                  {verifiedCount}
                </span>
                <span
                  style={{
                    fontSize: 14,
                    color: '#94a3b8',
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                    marginTop: 8,
                    fontFamily: 'system-ui, sans-serif',
                  }}
                >
                  Lease-verified
                </span>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            marginTop: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontFamily: 'system-ui, sans-serif',
            fontSize: 18,
            color: '#94a3b8',
          }}
        >
          <span>vettrentals.com</span>
          <span style={{ color: '#5eead4' }}>Read on Vett →</span>
        </div>
      </div>
    ),
    size
  )
}
