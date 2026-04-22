import { ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VerifiedBadgeProps {
  label?: string
  small?: boolean
  className?: string
}

export function VerifiedBadge({ label = 'Lease verified', small = false, className }: VerifiedBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-teal-200 bg-gradient-to-r from-teal-50 to-green-50 font-bold tracking-wide text-teal-800',
        small ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-[11px]',
        className
      )}
    >
      <ShieldCheck className={cn(small ? 'h-2.5 w-2.5' : 'h-3 w-3')} />
      {label}
    </span>
  )
}
