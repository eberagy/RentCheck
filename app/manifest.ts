import type { MetadataRoute } from 'next'

// PWA manifest. Two practical effects:
// 1. Chrome on Android shows "Install Vett" with the icon + theme color
//    once a user has visited a couple of pages — gets us a home-screen
//    presence without an app store listing.
// 2. Safari + browser theming pick up theme_color for the address bar
//    on mobile, which makes the brand land on first paint instead of
//    after the first style flush.
//
// Kept intentionally minimal — no screenshots, shortcuts, or
// share_target. Those become useful once we have native install
// adoption to justify maintaining them; speculative now.

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Vett — Know Before You Rent',
    short_name: 'Vett',
    description: 'Lease-verified renter reviews and public records on landlords nationwide.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    // Teal-700 — matches the gradient stop in app/icon.tsx and the
    // primary brand color used in the homepage CTA. Without this the
    // mobile address bar defaults to whatever the OS chrome picks
    // which can flash white→tinted on every page load.
    theme_color: '#0f766e',
    icons: [
      {
        // app/icon.tsx generates this at /icon — Next.js routes the
        // dynamic icon through this URL pattern. Marked "maskable"
        // so Android adaptive icons crop cleanly to circle/squircle.
        // (Next.js types reject the W3C-spec "any maskable" combo; pick
        // maskable since the icon has center-safe content.)
        src: '/icon',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
    categories: ['business', 'lifestyle', 'utilities'],
    lang: 'en-US',
  }
}
