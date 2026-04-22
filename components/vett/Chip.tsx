import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

type ChipTone = 'neutral' | 'teal' | 'amber' | 'rose' | 'sky' | 'violet' | 'navy'

const toneStyles: Record<ChipTone, { light: string; dark: string }> = {
  neutral: {
    light: 'bg-slate-100 border-slate-200 text-slate-600',
    dark: 'bg-white/[0.06] border-white/[0.12] text-slate-300 backdrop-blur-sm',
  },
  teal: {
    light: 'bg-teal-50 border-teal-200 text-teal-800',
    dark: 'bg-teal-400/[0.14] border-teal-300/25 text-teal-200 backdrop-blur-sm',
  },
  amber: {
    light: 'bg-amber-50 border-amber-200 text-amber-800',
    dark: 'bg-amber-400/[0.14] border-amber-300/25 text-amber-200 backdrop-blur-sm',
  },
  rose: {
    light: 'bg-red-50 border-red-200 text-red-800',
    dark: 'bg-red-400/[0.14] border-red-300/25 text-red-200 backdrop-blur-sm',
  },
  sky: {
    light: 'bg-sky-50 border-sky-200 text-sky-800',
    dark: 'bg-sky-400/[0.14] border-sky-300/25 text-sky-200 backdrop-blur-sm',
  },
  violet: {
    light: 'bg-violet-50 border-violet-200 text-violet-800',
    dark: 'bg-violet-400/[0.14] border-violet-300/25 text-violet-200 backdrop-blur-sm',
  },
  navy: {
    light: 'bg-navy-50 border-navy-200 text-navy-800',
    dark: 'bg-navy-400/[0.14] border-navy-300/25 text-navy-200 backdrop-blur-sm',
  },
}

interface ChipProps {
  children: ReactNode
  tone?: ChipTone
  dark?: boolean
  icon?: ReactNode
  className?: string
}

export function Chip({ children, tone = 'neutral', dark = false, icon, className }: ChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-[11px] font-semibold tracking-wide',
        dark ? toneStyles[tone].dark : toneStyles[tone].light,
        className
      )}
    >
      {icon}
      {children}
    </span>
  )
}
