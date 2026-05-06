import { Skeleton } from '@/components/ui/skeleton'

// Mirror the live compare page: max-w-5xl container with a back link,
// h1 + subtitle, then a 2-column grid of header cards (not 1-col-on-mobile
// as the previous skeleton implied — the live grid is grid-cols-2 at all
// breakpoints, which keeps the comparison readable side-by-side).
export default function CompareLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Skeleton className="h-4 w-16 mb-6" />
      <Skeleton className="h-10 w-72 mb-2" />
      <Skeleton className="h-4 w-96 mb-8" />

      <div className="grid grid-cols-2 gap-4 mb-6">
        {[1, 2].map(i => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
            <div className="grid grid-cols-2 gap-3 pt-2">
              {[1, 2, 3, 4].map(j => (
                <div key={j} className="space-y-1.5">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-6 w-16" />
                </div>
              ))}
            </div>
            <Skeleton className="h-2 w-full" />
            <div className="space-y-2 pt-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
