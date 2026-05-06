import { Skeleton } from '@/components/ui/skeleton'

// Shared loading skeleton for ALL /admin/* pages. Most admin pages share
// the same outer shape: p-4 sm:p-8 inside the AdminLayout flex container,
// a header row with an icon + h1 + meta, then a card or table below.
// Per-page skeletons would be 12 files of nearly identical markup, so
// one shared file at the route-group level is the better trade-off.
export default function AdminLoading() {
  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-3.5 w-64" />
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <Skeleton className="h-9 w-28 rounded-lg" />
        <Skeleton className="h-9 w-32 rounded-lg" />
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex gap-4">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-3.5 flex-1" />
            ))}
          </div>
        </div>
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="border-b border-slate-100 px-4 py-3 last:border-b-0">
            <div className="flex gap-4">
              {[1, 2, 3, 4, 5].map(j => (
                <Skeleton key={j} className="h-4 flex-1" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
