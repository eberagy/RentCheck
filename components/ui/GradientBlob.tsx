'use client'

import { cn } from '@/lib/utils'

interface GradientBlobProps {
  className?: string
  color?: 'teal' | 'blue' | 'purple' | 'rose'
  size?: 'sm' | 'md' | 'lg'
  animate?: boolean
}

const colorMap = {
  teal: 'from-teal-400/30 to-teal-600/10',
  blue: 'from-sky-400/25 to-blue-600/10',
  purple: 'from-violet-400/20 to-indigo-600/10',
  rose: 'from-rose-400/20 to-pink-600/10',
}

const sizeMap = {
  sm: 'h-32 w-32',
  md: 'h-64 w-64',
  lg: 'h-96 w-96',
}

export function GradientBlob({
  className,
  color = 'teal',
  size = 'md',
  animate = true,
}: GradientBlobProps) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute rounded-full bg-gradient-to-br blur-3xl',
        colorMap[color],
        sizeMap[size],
        animate && 'animate-blob',
        className
      )}
      aria-hidden="true"
    />
  )
}
