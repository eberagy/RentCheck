// Sentry configuration — import this in app/layout.tsx for error monitoring
// Full SDK init happens in instrumentation.ts (Next.js standard pattern)

export function captureException(error: unknown, context?: Record<string, unknown>) {
  if (process.env.NODE_ENV === 'development') {
    console.error('[Sentry]', error, context)
    return
  }
  // Skip the SDK import entirely when DSN isn't set — instrumentation.ts
  // gates init on the same flag, so a load here would just no-op anyway
  // but pays the chunk cost. Matches the env-blocker check in /api/health.
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return
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
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return
  import('@sentry/nextjs').then(({ setUser: set }) => {
    set({ id })
  }).catch(() => {})
}
