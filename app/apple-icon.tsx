import { ImageResponse } from 'next/og'

// iOS home-screen icon. 180×180 PNG generated at request time. iOS Safari
// looks for this exact path (or apple-touch-icon.png) when a user picks
// "Add to Home Screen." Without it, iOS uses a low-res page screenshot
// which looks broken at any zoom level.
//
// Mirror of app/icon.tsx — same palette and glyph, smaller render. iOS
// adds its own rounded-rect mask so we render a full bleed.

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
          fontSize: 140,
          fontWeight: 800,
          color: 'white',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          letterSpacing: -8,
        }}
      >
        V
      </div>
    ),
    size,
  )
}
