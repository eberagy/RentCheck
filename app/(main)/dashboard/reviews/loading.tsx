import { Skeleton } from '@/components/ui/skeleton'

// Mirror MyReviewsClient: 1100px container with px-6 py-10, back link,
// header (h1 + subtitle + right-aligned CTA), 5-pill filter strip, then
// stacked review cards. Without this the page flashed blank slate-50
// during the auth/fetch dance.
export default function MyReviewsLoading() {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="min-h-screen bg-slate-50">
      <span className="sr-only">Loading your reviews…</span>
      <div className="mx-auto max-w-[1100px] px-6 py-10">
        <Skeleton className="h-3.5 w-32 mb-5" />

        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-10 w-44 rounded-full" />
        </div>

        <div className="mb-5 flex flex-wrap gap-1.5">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-7 w-20 rounded-full" />
          ))}
        </div>

        <div className="grid gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-3.5 w-1/3" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
