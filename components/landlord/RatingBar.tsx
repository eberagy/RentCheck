import { cn } from '@/lib/utils'

interface RatingBarProps {
  label: string
  value: number | null
  max?: number
}

export function RatingBar({ label, value, max = 5 }: RatingBarProps) {
  if (!value) return null
  const pct = Math.round((value / max) * 100)
  const color = value >= 4 ? 'bg-teal-500' : value >= 3 ? 'bg-amber-400' : value >= 2 ? 'bg-orange-400' : 'bg-red-500'

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 w-28 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-gray-700 w-6 text-right shrink-0">{value.toFixed(1)}</span>
    </div>
  )
}
