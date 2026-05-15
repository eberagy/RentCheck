import { withSentryConfig } from '@sentry/nextjs'

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', 'vettrentals.com', '*.vettrentals.com', '*.vercel.app'],
    },
    serverComponentsExternalPackages: [
      '@sentry/nextjs',
      '@sentry/opentelemetry',
      '@opentelemetry/instrumentation',
      'require-in-the-middle',
    ],
  },
  async headers() {
    // CSP applied in production only. Dev needs eval (React Refresh) and
    // ws: (HMR) which would otherwise be blocked. Next.js App Router still
    // emits inline <script> tags for RSC hydration so 'unsafe-inline' on
    // script-src is unavoidable without a middleware-level nonce refactor —
    // accepted tradeoff for the launch CSP. Net win is still that no
    // third-party origin can inject script/img/font/connect outside the
    // allowlist below.
    const csp = [
      "default-src 'self'",
      // 'unsafe-inline' required by Next.js App Router hydration scripts.
      // PostHog hosts both the JS bundle and ingestion at the same origin.
      "script-src 'self' 'unsafe-inline' https://app.posthog.com https://*.posthog.com https://*.i.posthog.com",
      // 'unsafe-inline' required by Next.js inlined critical CSS + Tailwind
      // utility-class injection. Google Fonts CSS endpoint.
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      // data: for OG-image fetches in dev tools; blob: for client-side
      // PDF/canvas (used by /api/me/export download flow on some browsers).
      "img-src 'self' data: blob: https://*.supabase.co https://lh3.googleusercontent.com https://avatars.githubusercontent.com",
      "connect-src 'self' https://*.supabase.co https://app.posthog.com https://*.posthog.com https://*.i.posthog.com https://*.ingest.sentry.io https://*.sentry.io",
      "frame-ancestors 'none'",
      "frame-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      'upgrade-insecure-requests',
    ].join('; ')
    const isProd = process.env.NODE_ENV === 'production'
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
          // HSTS: tells browsers to use HTTPS for the next year. Required
          // for the apex + www to qualify for the HSTS preload list.
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          // Don't allow being framed even by us (combined with X-Frame-Options
          // DENY for older browsers). Stops clickjacking via embeds.
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'unsafe-none' },
          ...(isProd ? [{ key: 'Content-Security-Policy', value: csp }] : []),
        ],
      },
    ]
  },
  async rewrites() {
    return []
  },
}

// withSentryConfig auto-loads sentry.{client,server,edge}.config.ts so
// Sentry.init() runs in all three runtimes. Without this wrapper,
// sentry.client.config.ts would never load and the 30+ client-side
// captureException calls would silently no-op in production even with
// NEXT_PUBLIC_SENTRY_DSN set.
//
// silent:true suppresses the source-map-upload warning when
// SENTRY_AUTH_TOKEN isn't set — we don't upload source maps yet (a
// separate later improvement, gated on adding the token).
//
// hideSourceMaps:true keeps map files out of the .next/static bundle so
// they're not served to end users; Sentry only needs them server-side.
export default withSentryConfig(nextConfig, {
  silent: true,
  hideSourceMaps: true,
  // Tunnel through our own /monitoring route to bypass ad blockers — but
  // we don't currently have one, so leave off. Add when client-side
  // sample rate becomes meaningful (post-launch traffic data).
  // tunnelRoute: '/monitoring',
})
