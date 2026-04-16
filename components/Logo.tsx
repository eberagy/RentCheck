import Image from 'next/image'
import Link from 'next/link'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  href?: string
  className?: string
}

const SIZE_STYLES = {
  sm: {
    width: 132,
    height: 54,
  },
  md: {
    width: 164,
    height: 68,
  },
  lg: {
    width: 238,
    height: 98,
  },
} as const

export function Logo({ size = 'md', href = '/', className = '' }: LogoProps) {
  const styles = SIZE_STYLES[size]

  const el = (
    <Image
      src="/vett-logo.png"
      alt="Vett"
      width={styles.width}
      height={styles.height}
      priority={size === 'lg'}
      className={className}
    />
  )

  if (href) {
    return (
      <Link href={href} aria-label="Vett home">
        {el}
      </Link>
    )
  }

  return el
}
