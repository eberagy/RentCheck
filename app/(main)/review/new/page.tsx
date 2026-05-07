import { Suspense } from 'react'
import type { Metadata } from 'next'
import { Loader2 } from 'lucide-react'
import ReviewForm from './ReviewForm'

// noindex: this is an auth-required form — Google indexing it would surface
// "Write a review" landing pages that immediately gate behind sign-in.
export const metadata: Metadata = {
  title: 'Write a review',
  description: 'Share your lease-verified rental experience on Vett.',
  robots: { index: false, follow: false },
}

export default function NewReviewPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-navy-500" aria-hidden="true" /></div>}>
      <ReviewForm />
    </Suspense>
  )
}
