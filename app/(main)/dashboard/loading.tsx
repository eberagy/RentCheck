import { Skeleton } from '@/components/ui/skeleton'

// Match the live dashboard layout: bg-ink hero strip on top, 1320px
// container with main + 320px sidebar grid below. Without this the
// skeleton snaps to a totally different shape on hydration.
export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-slate-50">
      <section className="relative overflow-hidden bg-ink px-4 py-14 sm:px-8 text-white">
        <div className="relative mx-auto flex max-w-[1320px] flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-3">
            <Skeleton className="h-3.5 w-32 bg-white/10" />
            <Skeleton className="h-10 w-72 bg-white/10" />
            <Skeleton className="h-4 w-56 bg-white/10" />
          </div>
          <Skeleton className="h-10 w-40 rounded-md bg-white/15" />
        </div>
      </section>

      <div className="mx-auto grid max-w-[1320px] gap-6 px-4 py-7 sm:px-8 lg:grid-cols-[1fr_320px]">
        <div className="grid gap-5">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-[24px] border border-slate-200 bg-white p-6 space-y-3">
              <Skeleton className="h-5 w-44" />
              <div className="grid gap-2.5">
                {[1, 2].map(j => (
                  <Skeleton key={j} className="h-14 w-full rounded-[16px]" />
                ))}
              </div>
            </div>
          ))}
        </div>

        <aside className="grid gap-4 self-start">
          <Skeleton className="h-44 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </aside>
      </div>
    </div>
  )
}
