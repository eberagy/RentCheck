// Sentry configuration — import this in app/layout.tsx for error monitoring
// Full SDK init happens in instrumentation.ts (Next.js standard pattern)

export function captureException(error: unknown, context?: Record<string, unknown>) {
  if (process.env.NODE_ENV === 'development') {
    console.error('[Sentry]', error, context)
    return
  }
  // Dynamic import to avoid bundling Sentry in dev
  import('@sentry/nextjs').then(({ captureException: capture }) => {
    capture(error, { extra: context })
  }).catch(() => {})
}

// Email is intentionally omitted from Sentry's user context. Sentry retains
// breadcrumbs + events for 90 days and is shared with whoever has Sentry
// access — passing email here would leak renter PII into a third-party
// retention window. The id alone is enough to count "users impacted" on
// any issue; cross-reference with Supabase if a specific report needs it.
export function setUser(id: string) {
  import('@sentry/nextjs').then(({ setUser: set }) => {
    set({ id })
  }).catch(() => {})
}
