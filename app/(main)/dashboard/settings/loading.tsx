import { Skeleton } from '@/components/ui/skeleton'

export default function SettingsLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-9 w-72" />
      <Skeleton className="h-4 w-96" />
      <div className="bg-white border border-gray-200 rounded-xl divide-y">
        {[0, 1, 2].map(i => (
          <div key={i} className="p-6 space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  )
}
