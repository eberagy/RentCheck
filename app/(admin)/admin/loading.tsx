import { Skeleton } from '@/components/ui/skeleton'

export default function AdminLoading() {
  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 p-4">
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="divide-y divide-slate-100">
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} className="flex items-center gap-3 p-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
