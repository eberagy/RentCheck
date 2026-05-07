import { Skeleton } from '@/components/ui/skeleton'

// Mirrors the live page: a full-bleed white hero strip with a centered
// 820px content slot containing the gradient avatar tile + name + meta,
// then a 820px section below with the review-card list. Without this the
// skeleton was snapping from a single-card layout to the hero+section
// shape on hydration.
export default function RenterProfileLoading() {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="min-h-screen bg-slate-50">
      <span className="sr-only">Loading reviewer profile…</span>
      <section className="border-b border-slate-200 bg-white px-7 py-12">
        <div className="mx-auto max-w-[820px] flex items-center gap-5">
          <Skeleton className="h-20 w-20 rounded-2xl flex-shrink-0" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-72" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[820px] px-7 py-10">
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
