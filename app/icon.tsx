import { ImageResponse } from 'next/og'

// PWA / Android home-screen / browser tab icon. 512×512 PNG generated at
// request time by Satori (next/og's renderer). No raster source asset
// needed — keeps the repo lean and the icon stays in sync with the brand
// colors defined here.
//
// Matches /public/logo.svg's color palette: teal house on a soft slate
// background, plus a stylized "v" mark for instant recognizability at
// favicon size.

export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

export default function Icon() {
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
          borderRadius: 96,
          fontSize: 380,
          fontWeight: 800,
          color: 'white',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          letterSpacing: -20,
        }}
      >
        V
      </div>
    ),
    size,
  )
}
