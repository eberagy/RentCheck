import Link from 'next/link'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  href?: string
  className?: string
}

export function Logo({ size = 'md', href = '/', className = '' }: LogoProps) {
  const dims = { sm: { shield: 20, text: 14 }, md: { shield: 28, text: 18 }, lg: { shield: 36, text: 24 } }
  const d = dims[size]

  const el = (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Shield */}
      <svg width={d.shield} height={d.shield} viewBox="0 0 24 28" fill="none">
        <path d="M12 0L24 4V18C24 23.523 18.627 28.523 12 31C5.373 28.523 0 23.523 0 18V4L12 0Z" fill="#1E3A5F"/>
        <path d="M12 4L20 7.2V17.6C20 21.901 16.701 25.701 12 27.2C7.299 25.701 4 21.901 4 17.6V7.2L12 4Z" fill="#0F7B6C"/>
        <text x="6.5" y="19" fontFamily="Inter, system-ui" fontSize="9" fontWeight="700" fill="white" letterSpacing="-0.3">RC</text>
      </svg>
      {/* Wordmark */}
      <span
        style={{ fontSize: d.text, fontWeight: 700, color: '#1E3A5F', letterSpacing: '-0.03em', fontFamily: 'Inter, system-ui, sans-serif' }}
      >
        RentCheck
      </span>
    </div>
  )

  if (href) return <Link href={href}>{el}</Link>
  return el
}
