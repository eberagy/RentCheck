import Link from 'next/link'
import { cn } from '@/lib/utils'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  href?: string
  className?: string
  inverted?: boolean
}

const sizeMap = {
  sm: { badge: 'h-6 w-6', text: 'text-lg', gap: 'gap-1.5' },
  md: { badge: 'h-8 w-8', text: 'text-xl', gap: 'gap-2' },
  lg: { badge: 'h-10 w-10', text: 'text-2xl', gap: 'gap-2.5' },
}

export function Logo({ size = 'md', href = '/', className = '', inverted = false }: LogoProps) {
  const s = sizeMap[size]

  const el = (
    <span className={cn('inline-flex items-center', s.gap, className)}>
      {/* Circular badge mark */}
      <svg
        viewBox="0 0 32 32"
        xmlns="http://www.w3.org/2000/svg"
        className={cn('flex-shrink-0 rounded-full', s.badge)}
        aria-hidden="true"
        style={{ background: 'transparent' }}
      >
        <circle cx="16" cy="16" r="16" fill="#0d9488" />
        <path
          d="M9 16.5l5 5 9-10.5"
          fill="none"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* Wordmark */}
      <span className={cn('font-black tracking-tight leading-none', s.text, inverted ? 'text-white' : 'text-slate-900')}>
        Vett
      </span>
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
