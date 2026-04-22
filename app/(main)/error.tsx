'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { captureException } from '@/lib/sentry'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    captureException(error)
  }, [error])

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
      <div className="text-center max-w-md">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 ring-1 ring-amber-100">
          <AlertTriangle className="h-7 w-7 text-amber-600" aria-hidden="true" />
        </div>
        <h1 className="font-display text-[clamp(1.75rem,3.5vw,2.25rem)] leading-[1.08] tracking-tight text-slate-900 mb-3">Something went wrong</h1>
        <p className="text-slate-500 mb-8 text-[15px] leading-relaxed">
          We&apos;ve been notified and are looking into it. Try refreshing or head back home.
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={reset} className="bg-teal-600 hover:bg-teal-700 text-white">
            <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
            Try Again
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Home</Link>
          </Button>
        </div>
        {error.digest && (
          <p className="text-xs text-slate-400 mt-6 font-mono">Error ID: {error.digest}</p>
        )}
      </div>
    </div>
  )
}
