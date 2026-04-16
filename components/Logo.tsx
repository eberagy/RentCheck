import Link from 'next/link'
import { cn } from '@/lib/utils'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  href?: string
  className?: string
  inverted?: boolean
}

export function Logo({ size = 'md', href = '/', className = '', inverted = false }: LogoProps) {
  const sizeMap = {
    sm: { text: 'text-xl', dot: 'h-2 w-2' },
    md: { text: 'text-2xl', dot: 'h-2.5 w-2.5' },
    lg: { text: 'text-3xl', dot: 'h-3 w-3' },
  }
  const s = sizeMap[size]

  const el = (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <span className={cn('font-black tracking-tight', s.text, inverted ? 'text-white' : 'text-navy-900')}>
        Vett
      </span>
      <span className={cn('rounded-full bg-teal-500 flex-shrink-0', s.dot)} />
    </span>
  )

  if (href) {
    return (
      <Link href={href} aria-label="Vett home" className="focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded-sm">
        {el}
      </Link>
    )
  }

  return el
}
