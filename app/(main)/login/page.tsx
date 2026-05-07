import { Suspense } from 'react'
import type { Metadata } from 'next'
import { Loader2 } from 'lucide-react'
import LoginClient from './LoginClient'

// Auth pages aren't useful in search results — the landing target is the
// auth client, not the page. noindex keeps Google from surfacing
// "Sign in to Vett" results above more relevant content.
export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to Vett to write lease-verified reviews, save searches, and watch landlords.',
  robots: { index: false, follow: false },
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div role="status" aria-live="polite" className="min-h-[60vh] flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-navy-500" aria-hidden="true" /><span className="sr-only">Loading sign in…</span></div>}>
      <LoginClient />
    </Suspense>
  )
}
