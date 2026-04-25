import { Skeleton } from '@/components/ui/skeleton'

export default function CompareLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Skeleton className="h-9 w-72 mb-6" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2].map(i => (
          <div key={i} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-4 w-40" />
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
