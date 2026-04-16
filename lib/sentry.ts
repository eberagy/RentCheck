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

export function setUser(id: string, email?: string) {
  import('@sentry/nextjs').then(({ setUser: set }) => {
    set({ id, email })
  }).catch(() => {})
}
