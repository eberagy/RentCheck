import Link from 'next/link'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  href?: string
  className?: string
  inverted?: boolean
}

const sizeMap = {
  sm: { px: 24, text: 'text-lg', gap: 'gap-1.5' },
  md: { px: 32, text: 'text-xl', gap: 'gap-2' },
  lg: { px: 40, text: 'text-2xl', gap: 'gap-2.5' },
}

export function Logo({ size = 'md', href = '/', className = '', inverted = false }: LogoProps) {
  const s = sizeMap[size]

  const el = (
    <span className={cn('inline-flex items-center', s.gap, className)}>
      {/* House icon cropped to circle */}
      <span
        className="flex-shrink-0 rounded-full overflow-hidden bg-[#0e1628]"
        style={{ width: s.px, height: s.px }}
      >
        <Image
          src="/vett-logo.png"
          alt="Vett logo"
          width={s.px * 3}
          height={s.px * 3}
          style={{
            width: s.px,
            height: s.px,
            objectFit: 'cover',
            // Center on the house icon (it sits slightly left of center in the image)
            objectPosition: '42% 50%',
            transform: 'scale(1.6)',
            transformOrigin: '42% 50%',
          }}
          priority
        />
      </span>

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
