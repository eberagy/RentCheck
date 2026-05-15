import * as Sentry from '@sentry/nextjs'

// Client-side (browser) Sentry init. Companion to sentry.server.config.ts
// and sentry.edge.config.ts. Sentry v8+ removed auto-init, so without
// this file the captureException calls in lib/sentry.ts and 30+ catch
// blocks across app/ would silently no-op in the browser — server-side
// captures would still work, but client-side React errors and toast-only
// failure paths would never reach Sentry.
//
// Auto-loaded by withSentryConfig in next.config.mjs. Gate on the same
// NEXT_PUBLIC_SENTRY_DSN flag the rest of the codebase uses so unconfigured
// environments stay zero-cost.
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    // Same sampling shape as server/edge: 20% in prod, 100% elsewhere.
    tracesSampleRate: process.env.NEXT_PUBLIC_VERCEL_ENV === 'production' ? 0.2 : 1.0,
    // Commit SHA from Vercel build — lets the Sentry Issues page show
    // "first seen in v258508b" instead of an opaque release id.
    release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? 'development',
    // Session replay is enabled by default in @sentry/nextjs v8; we
    // explicitly disable it to avoid the ~50 KB bundle cost and the
    // PII-capture surface (replays record every keystroke/input by
    // default). Re-enable later via integrations:[replayIntegration]
    // if we decide to opt in with proper masking config.
    integrations: [],
    replaysOnErrorSampleRate: 0,
    replaysSessionSampleRate: 0,
  })
}
