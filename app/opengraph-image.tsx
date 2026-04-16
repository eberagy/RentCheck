import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'Vett — Know Before You Rent.'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          background: '#0f172a',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Logo mark */}
        <div
          style={{
            width: '80px',
            height: '80px',
            background: '#14b8a6',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '32px',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              border: '5px solid #ffffff',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: '12px',
                height: '12px',
                background: '#ffffff',
                borderRadius: '50%',
              }}
            />
          </div>
        </div>

        {/* Brand name */}
        <div
          style={{
            fontSize: '96px',
            fontWeight: 800,
            color: '#ffffff',
            letterSpacing: '-3px',
            lineHeight: 1,
          }}
        >
          Vett
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: '36px',
            fontWeight: 500,
            color: '#14b8a6',
            marginTop: '20px',
            letterSpacing: '0.5px',
          }}
        >
          Know before you rent.
        </div>

        {/* Divider */}
        <div
          style={{
            width: '80px',
            height: '3px',
            background: '#1e293b',
            marginTop: '40px',
          }}
        />

        {/* Sub-tagline */}
        <div
          style={{
            fontSize: '22px',
            color: '#94a3b8',
            marginTop: '24px',
            letterSpacing: '0.3px',
          }}
        >
          Verified renter reviews + public records on landlords nationwide.
        </div>
      </div>
    ),
    { ...size }
  )
}
