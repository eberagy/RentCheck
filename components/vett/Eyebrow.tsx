import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

type EyebrowTone = 'teal' | 'amber' | 'navy'

const lightTones: Record<EyebrowTone, string> = {
  teal: 'bg-teal-50 border-teal-200 text-teal-800',
  amber: 'bg-amber-50 border-amber-200 text-amber-800',
  navy: 'bg-navy-50 border-navy-200 text-navy-800',
}

const dotColors: Record<EyebrowTone, string> = {
  teal: 'bg-teal-400',
  amber: 'bg-amber-400',
  navy: 'bg-sky-400',
}

interface EyebrowProps {
  children: ReactNode
  dark?: boolean
  dot?: boolean
  tone?: EyebrowTone
  className?: string
}

export function Eyebrow({ children, dark = false, dot = false, tone = 'teal', className }: EyebrowProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2.5 rounded-full border px-3.5 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.22em]',
        dark
          ? 'border-white/[0.12] bg-white/[0.08] text-slate-300 backdrop-blur-sm'
          : lightTones[tone],
        className
      )}
    >
      {dot && (
        <span className="relative inline-flex h-1.5 w-1.5">
          <span className={cn('absolute inset-0 animate-ping rounded-full opacity-75', dotColors[tone])} />
          <span className={cn('relative inline-flex h-1.5 w-1.5 rounded-full', dotColors[tone])} />
        </span>
      )}
      {children}
    </span>
  )
}
