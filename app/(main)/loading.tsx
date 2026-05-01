import { Skeleton } from '@/components/ui/skeleton'

// Root loading state for /(main) — covers the homepage's RSC stats fetch
// (getStats + getRecentReviews) so visitors see structure, not a blank
// page, while the server-rendered hero loads.
export default function MainLoading() {
  return (
    <div className="min-h-screen bg-[#07111f]">
      <section className="relative overflow-hidden px-4 py-20 sm:px-7 sm:py-24 text-white">
        <div className="mx-auto max-w-[1100px] space-y-6">
          <Skeleton className="h-4 w-44 bg-white/10" />
          <Skeleton className="h-16 w-full max-w-[640px] bg-white/10" />
          <Skeleton className="h-5 w-full max-w-[460px] bg-white/[0.06]" />
          <Skeleton className="h-12 w-full max-w-[560px] bg-white/[0.06]" />
          <div className="mt-12 grid grid-cols-1 gap-y-6 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-white/[0.06] border-t border-white/[0.08] pt-8">
            {[0, 1, 2].map(i => (
              <div key={i} className={i === 0 ? 'pr-6' : i === 1 ? 'px-6' : 'pl-6'}>
                <Skeleton className="h-10 w-32 bg-white/10" />
                <Skeleton className="mt-2 h-3 w-20 bg-white/[0.06]" />
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="bg-white px-4 py-20 sm:px-7">
        <div className="mx-auto max-w-[1100px]">
          <Skeleton className="h-4 w-32 mb-3" />
          <Skeleton className="h-10 w-2/3 max-w-[480px] mb-10" />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[0, 1, 2].map(i => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-5 w-12" />
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
