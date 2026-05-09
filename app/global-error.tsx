'use client'

import { useEffect } from 'react'
import { captureException } from '@/lib/sentry'

// global-error.tsx catches errors that occur in the root layout or at
// metadata-generation time, before any route group's error boundary gets
// a chance to render. Must define its own <html> + <body> since the root
// layout itself may have failed.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Include the Next.js digest so a user reporting the visible
    // "Error ID: xxxx" copy can be correlated to the Sentry event.
    // (main)/error.tsx already passes digest; bring global into parity.
    captureException(error, { where: 'global', digest: error.digest })
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          fontFamily:
            'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          margin: 0,
          background: '#F8FAFC',
          color: '#0F172A',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
        }}
      >
        <div style={{ maxWidth: 480, textAlign: 'center' }}>
          <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 12 }}>
            Something went wrong
          </h1>
          <p style={{ color: '#64748b', fontSize: 15, marginBottom: 24 }}>
            Vett ran into a problem loading this page. We&apos;ve been notified.
            Try refreshing — if it keeps happening, head back to the homepage.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                padding: '10px 20px',
                background: '#0f7b6c',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{
                display: 'inline-block',
                padding: '10px 20px',
                background: '#1e3a5f',
                color: '#fff',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Go home
            </a>
          </div>
          {error.digest && (
            <p
              style={{
                marginTop: 24,
                fontSize: 11,
                fontFamily: 'monospace',
                color: '#94a3b8',
              }}
            >
              Error ID: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  )
}
