import { cn, severityColor, severityLabel } from '@/lib/utils'
import type { Severity } from '@/types'

interface ViolationBadgeProps {
  severity: Severity | null
  status?: string | null
  violationClass?: string | null
  size?: 'sm' | 'md'
}

export function ViolationBadge({ severity, status, violationClass, size = 'md' }: ViolationBadgeProps) {
  const isClosed = status?.toLowerCase() === 'closed' || status?.toLowerCase() === 'dismissed'
  const label = isClosed ? 'Closed' : severityLabel(severity)

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-semibold',
        size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
        isClosed
          ? 'bg-slate-100 text-slate-500 border border-slate-200'
          : severityColor(severity)
      )}
    >
      {violationClass && !isClosed && (
        <span className="mr-1 opacity-80">Class {violationClass}</span>
      )}
      {label}
    </span>
  )
}
