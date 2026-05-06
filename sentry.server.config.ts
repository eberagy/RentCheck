import * as Sentry from '@sentry/nextjs'

// Server-side Sentry init. Only loaded by instrumentation.ts when
// NEXT_PUBLIC_SENTRY_DSN is set, so dev/preview without the DSN never
// pay the SDK import cost.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Sample rate: 100% in non-prod (catches local repros), 20% in prod
  // (Sentry's free tier is 5k events/month). Bump to 1.0 if we hit a
  // bad release and need full coverage temporarily.
  tracesSampleRate: process.env.VERCEL_ENV === 'production' ? 0.2 : 1.0,
  // Vercel sets VERCEL_GIT_COMMIT_SHA on deploys — tag every event with
  // the commit so we can correlate spikes to specific pushes.
  release: process.env.VERCEL_GIT_COMMIT_SHA,
  environment: process.env.VERCEL_ENV ?? 'development',
})
