'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { captureException } from '@/lib/sentry'

// Error boundary for the (admin) route group. Without this, errors inside
// admin pages bubble to the root error.tsx (which is the public-facing
// "Something went wrong" template). Admins benefit from seeing the digest
// + a link back to the admin home rather than the user-friendly variant.
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    captureException(error, { where: 'admin' })
  }, [error])

  return (
    <div className="p-4 sm:p-8">
      <div className="mx-auto max-w-xl rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-slate-900">Admin route errored</h1>
            <p className="mt-1.5 text-sm text-amber-900/80">
              The action didn&apos;t complete. Sentry has the trace; retry below or
              head back to the admin home.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button onClick={reset} size="sm" className="bg-slate-900 text-white hover:bg-slate-800">
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
                Try again
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/admin">Admin home</Link>
              </Button>
            </div>
            {error.digest && (
              <p className="mt-4 text-[11px] font-mono text-amber-900/70">
                Error ID: {error.digest}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
