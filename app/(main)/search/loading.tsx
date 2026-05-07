import { Skeleton } from '@/components/ui/skeleton'

// Match the live /search layout: full-bleed white search-bar band on top
// (input + meta line + city quick-links), then 1320px container with
// 240px filter sidebar on lg+ and a single-column results list. Without
// the top band the skeleton would render only the sidebar+results, and
// on hydration ~140px of content would suddenly appear above, shifting
// the result list downward.
export default function SearchLoading() {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="min-h-screen bg-slate-50">
      <span className="sr-only">Loading search…</span>
      <section className="border-b border-slate-200 bg-white px-7 py-5">
        <div className="mx-auto max-w-[1320px]">
          <Skeleton className="h-7 w-full max-w-[760px] rounded-md" />
          <Skeleton className="mt-3 h-3.5 w-72" />
          <div className="mt-3 flex flex-wrap gap-1.5">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-7 w-24 rounded-full" />
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-[1320px] gap-7 px-4 py-7 sm:px-8 lg:grid-cols-[240px_1fr]">
        <aside className="flex flex-col gap-5">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </aside>
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-1">
            <div className="flex gap-1.5">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-8 w-24 rounded-full" />
              ))}
            </div>
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="grid gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
