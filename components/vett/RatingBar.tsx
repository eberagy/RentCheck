interface RatingBarProps {
  label: string
  value: number | null
  max?: number
}

export function RatingBar({ label, value, max = 5 }: RatingBarProps) {
  const pct = value == null ? 0 : (value / max) * 100

  return (
    <div className="grid grid-cols-[160px_1fr_46px] items-center gap-3">
      <span className="text-[13px] text-slate-600">{label}</span>
      <div className="h-[7px] overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-teal-500 to-teal-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-right text-[13px] font-semibold text-slate-900">
        {value == null ? '\u2014' : value.toFixed(1)}
      </span>
    </div>
  )
}
