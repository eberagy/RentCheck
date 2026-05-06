import * as Sentry from '@sentry/nextjs'

// Edge-runtime Sentry init (middleware, edge route handlers, og-image
// edge functions). Lighter SDK surface — same DSN + sample rate as
// server config so events flow into the same project.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.VERCEL_ENV === 'production' ? 0.2 : 1.0,
  release: process.env.VERCEL_GIT_COMMIT_SHA,
  environment: process.env.VERCEL_ENV ?? 'development',
})
