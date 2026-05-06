import { Skeleton } from '@/components/ui/skeleton'

// Match the live search layout: 1320px container, 240px filter sidebar
// on lg+, single-column results list with 24px row gaps. Avoids a
// sidebar-width snap when the page hydrates.
export default function SearchLoading() {
  return (
    <div className="mx-auto grid max-w-[1320px] gap-7 px-4 py-7 sm:px-8 lg:grid-cols-[240px_1fr]">
      <aside className="flex flex-col gap-5">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </aside>
      <div>
        <Skeleton className="h-12 w-full mb-4 rounded-xl" />
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
  )
}
