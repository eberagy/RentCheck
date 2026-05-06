import { Skeleton } from '@/components/ui/skeleton'

// Mirror WatchlistClient: 1100px container with px-6 py-10, back link,
// header row (title + subtitle + right-aligned CTA), filter strip, then
// a list of watch-cards. The page renders auth-gated content so on a
// cold visit the user otherwise sees a blank slate-50 background until
// the client tree resolves.
export default function WatchlistLoading() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-[1100px] px-6 py-10">
        <Skeleton className="h-3.5 w-32 mb-5" />

        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-4 w-80" />
          </div>
          <Skeleton className="h-10 w-44 rounded-full" />
        </div>

        <div className="mb-4 flex items-center gap-2">
          <Skeleton className="h-7 w-20 rounded-full" />
          <Skeleton className="h-7 w-24 rounded-full" />
        </div>

        <div className="grid gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-5 w-56" />
                  <Skeleton className="h-3.5 w-72" />
                </div>
                <div className="flex flex-shrink-0 items-center gap-1.5">
                  <Skeleton className="h-8 w-24 rounded-full" />
                  <Skeleton className="h-8 w-20 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
