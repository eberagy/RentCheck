import { Skeleton } from '@/components/ui/skeleton'

export default function CityLoading() {
  return (
    <div className="min-h-screen bg-slate-50">
      <section
        className="relative isolate overflow-hidden text-white"
        style={{
          background:
            'radial-gradient(ellipse at 20% 30%, rgba(94,148,255,0.18), transparent 45%), radial-gradient(ellipse at 80% 20%, rgba(45,212,191,0.18), transparent 40%), #07111f',
        }}
      >
        <div className="relative mx-auto max-w-[1320px] px-4 sm:px-8 py-16">
          <Skeleton className="h-4 w-56 bg-white/10" />
          <Skeleton className="mt-5 h-14 w-2/3 bg-white/10" />
          <Skeleton className="mt-3 h-14 w-1/2 bg-white/10" />
          <Skeleton className="mt-6 h-5 w-full max-w-md bg-white/10" />
          <Skeleton className="mt-10 h-12 w-full max-w-[560px] rounded-lg bg-white/10" />
          <div className="mt-14 flex flex-wrap gap-x-10 gap-y-3 border-t border-white/10 pt-7">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-7 w-20 bg-white/10" />
                <Skeleton className="h-4 w-32 bg-white/10" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1320px] px-6 py-12">
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-1/2" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
                <Skeleton className="h-9 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
