import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import ReviewForm from './ReviewForm'

export default function NewReviewPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-navy-500" /></div>}>
      <ReviewForm />
    </Suspense>
  )
}
