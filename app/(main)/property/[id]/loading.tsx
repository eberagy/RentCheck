import { Skeleton } from '@/components/ui/skeleton'

// Match the live property page layout (1320px container + 320px sticky
// sidebar on lg+) so the skeleton doesn't snap-shift on hydration.
export default function PropertyLoading() {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="min-h-screen bg-slate-50">
      <span className="sr-only">Loading property profile…</span>
      <div className="mx-auto max-w-[1320px] px-4 py-8 sm:px-8">
        <Skeleton className="h-3.5 w-64 mb-6" />

        <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="h-[3px] bg-gradient-to-r from-navy-600 via-sky-500 to-teal-500" />
          <div className="px-5 py-7 sm:px-8 sm:py-8">
            <div className="flex items-start gap-4">
              <Skeleton className="h-14 w-14 rounded-2xl" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-9 w-3/4" />
                <Skeleton className="h-4 w-48" />
                <div className="flex gap-2 pt-1">
                  <Skeleton className="h-6 w-24 rounded-full" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              </div>
            </div>
            <div className="mt-5 border-t border-slate-100 pt-5">
              <Skeleton className="h-2.5 w-20" />
              <Skeleton className="mt-2 h-4 w-full" />
              <Skeleton className="mt-1.5 h-4 w-3/4" />
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8 lg:items-start">
          <div className="min-w-0 order-2 lg:order-1 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-16 w-full" />
              </div>
            ))}
          </div>

          <aside className="order-1 lg:order-2 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <Skeleton className="h-2.5 w-20" />
              <Skeleton className="mt-3 h-11 w-20" />
              <Skeleton className="mt-3 h-3.5 w-32" />
              <div className="mt-4 space-y-2">
                <Skeleton className="h-9 w-full rounded-full" />
                <Skeleton className="h-8 w-32 rounded-full" />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
