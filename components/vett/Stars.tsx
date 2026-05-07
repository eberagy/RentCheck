interface StarsProps {
  value: number
  size?: number
  max?: number
}

export function Stars({ value = 0, size = 14, max = 5 }: StarsProps) {
  // Round-half display matches the visual filled state. Screen readers
  // announce the rating once on the wrapper instead of 5 ambiguous SVG
  // image elements.
  const rounded = Math.round(value * 10) / 10
  return (
    <div
      className="inline-flex items-center gap-0.5"
      role="img"
      aria-label={value > 0 ? `Rated ${rounded} out of ${max} stars` : 'No rating yet'}
    >
      {Array.from({ length: max }).map((_, i) => {
        const filled = i < Math.round(value)
        return (
          <svg key={i} width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" focusable="false">
            <path
              d="M10 1.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L10 14.8 4.8 17.5l1-5.8L1.6 7.6l5.8-.8z"
              fill={filled ? '#F59E0B' : '#E2E8F0'}
              stroke={filled ? '#F59E0B' : '#E2E8F0'}
              strokeWidth="0.5"
              strokeLinejoin="round"
            />
          </svg>
        )
      })}
    </div>
  )
}
