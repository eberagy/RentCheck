// Next.js standard pattern for initializing observability SDKs.
// Runs once per server cold start, before any request.
// https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation
//
// Sentry init is gated on NEXT_PUBLIC_SENTRY_DSN — without the DSN we
// short-circuit so dev / preview / unconfigured prod don't pay the
// import cost or emit warnings about missing config.

import type * as Sentry from '@sentry/nextjs'

export async function register() {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

/**
 * Server-component / RSC error hook. Sentry v8+ requires this export to
 * capture errors thrown during server rendering — without it, RSC errors
 * (failed Supabase queries in async pages, throws inside page components)
 * land in Vercel logs but never reach Sentry, so we lose deduplication,
 * stack-trace symbolication, and per-issue alerting.
 *
 * Lazy-imports the SDK so DSN-less environments stay zero-cost.
 *
 * https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/#custom-server-error-hook
 */
export const onRequestError: typeof Sentry.captureRequestError = (...args) => {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  import('@sentry/nextjs').then(({ captureRequestError }) => {
    captureRequestError(...args)
  }).catch(() => {})
}
