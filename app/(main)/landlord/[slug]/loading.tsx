import { Skeleton } from '@/components/ui/skeleton'

// Mirror the live page layout (1320px container, 320px sticky sidebar
// on lg+, 4-up stat strip in the hero, tabs in the main column) so
// the skeleton doesn't snap to a different shape on hydration.
export default function LandlordLoading() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="mx-auto max-w-[1320px] px-4 py-7 sm:px-8">
        <Skeleton className="h-3.5 w-48 mb-4" />

        {/* Hero card */}
        <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="h-[3px] bg-gradient-to-r from-navy-600 via-sky-500 to-teal-500" />
          <div className="px-5 py-7 sm:px-8 sm:py-8">
            <div className="flex items-start gap-4">
              <Skeleton className="h-14 w-14 flex-shrink-0 rounded-2xl" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-9 w-2/3" />
                <Skeleton className="h-4 w-40" />
                <div className="flex flex-wrap gap-2 pt-1">
                  <Skeleton className="h-6 w-32 rounded-full" />
                  <Skeleton className="h-6 w-24 rounded-full" />
                  <Skeleton className="h-6 w-28 rounded-full" />
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 divide-x divide-slate-100 border-t border-slate-100 sm:grid-cols-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="px-5 py-4 sm:px-6 sm:py-5">
                <Skeleton className="h-2.5 w-20" />
                <Skeleton className="mt-2 h-7 w-12" />
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8 lg:items-start">
          <div className="min-w-0 order-2 lg:order-1 space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <Skeleton className="h-4 w-40 mb-4" />
              <div className="grid gap-x-10 gap-y-3.5 sm:grid-cols-2">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-3.5 w-28" />
                    <Skeleton className="h-1.5 flex-1" />
                    <Skeleton className="h-3.5 w-6" />
                  </div>
                ))}
              </div>
            </div>

            <Skeleton className="h-12 w-full rounded-2xl" />

            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
                  <div className="flex items-start gap-3">
                    <Skeleton className="h-9 w-9 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-5 w-24" />
                  </div>
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ))}
            </div>
          </div>

          <aside className="order-1 lg:order-2 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <Skeleton className="h-2.5 w-20" />
              <Skeleton className="mt-3 h-11 w-20" />
              <Skeleton className="mt-3 h-3.5 w-32" />
              <div className="mt-4 space-y-2">
                <Skeleton className="h-9 w-full rounded-full" />
                <div className="flex gap-1.5">
                  <Skeleton className="h-8 w-24 rounded-full" />
                  <Skeleton className="h-8 w-16 rounded-full" />
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
