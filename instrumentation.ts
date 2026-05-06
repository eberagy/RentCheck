// Next.js standard pattern for initializing observability SDKs.
// Runs once per server cold start, before any request.
// https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation
//
// Sentry init is gated on NEXT_PUBLIC_SENTRY_DSN — without the DSN we
// short-circuit so dev / preview / unconfigured prod don't pay the
// import cost or emit warnings about missing config.

export async function register() {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}
