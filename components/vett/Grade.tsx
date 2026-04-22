import { GRADE_STYLES, type GradeLetter } from '@/lib/grade'
import { cn } from '@/lib/utils'

const sizes = {
  sm: 'h-8 w-8 text-sm rounded-lg',
  md: 'h-11 w-11 text-xl rounded-xl',
  lg: 'h-14 w-14 text-2xl rounded-xl',
  xl: 'h-[88px] w-[88px] text-[44px] rounded-2xl',
} as const

interface GradeProps {
  letter: GradeLetter | null | undefined
  size?: keyof typeof sizes
  className?: string
}

export function Grade({ letter, size = 'md', className }: GradeProps) {
  if (!letter) return null
  const style = GRADE_STYLES[letter] ?? GRADE_STYLES.C

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center font-extrabold tracking-tight',
        sizes[size],
        className
      )}
      style={{
        background: style.bg,
        border: `1.5px solid ${style.bd}`,
        color: style.fg,
      }}
    >
      {letter}
    </div>
  )
}
