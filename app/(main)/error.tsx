'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { captureException } from '@/lib/sentry'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    captureException(error)
  }, [error])

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-5xl mb-4">⚠️</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h1>
        <p className="text-gray-500 mb-8 text-sm">
          We&apos;ve been notified and are looking into it. Try refreshing or go back to search.
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={reset} className="bg-navy-500 hover:bg-navy-600 text-white">
            Try Again
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Home</Link>
          </Button>
        </div>
        {error.digest && (
          <p className="text-xs text-gray-300 mt-4">Error ID: {error.digest}</p>
        )}
      </div>
    </div>
  )
}
