'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StarRatingProps {
  value: number
  onChange?: (value: number) => void
  readonly?: boolean
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

const LABELS = ['', 'Very Poor', 'Poor', 'Fair', 'Good', 'Excellent']
const SIZES = { sm: 'h-3 w-3', md: 'h-5 w-5', lg: 'h-7 w-7' }

export function StarRating({ value, onChange, readonly = false, size = 'md', showLabel = false }: StarRatingProps) {
  const [hovered, setHovered] = useState(0)
  const display = readonly ? value : (hovered || value)
  const starSize = SIZES[size]

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(star => {
          const filled = star <= display
          const halfFilled = !filled && star - 0.5 <= display
          return (
            <button
              key={star}
              type="button"
              disabled={readonly}
              onClick={() => onChange?.(star)}
              onMouseEnter={() => !readonly && setHovered(star)}
              onMouseLeave={() => !readonly && setHovered(0)}
              className={cn(
                'transition-transform rounded-sm',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2',
                !readonly && 'hover:scale-110 cursor-pointer',
                readonly && 'cursor-default'
              )}
              aria-label={`${star} star${star !== 1 ? 's' : ''}`}
              aria-pressed={!readonly && star <= display}
            >
              <Star
                className={cn(
                  starSize,
                  'transition-colors',
                  filled
                    ? 'fill-amber-400 text-amber-400'
                    : halfFilled
                    ? 'fill-amber-200 text-amber-400'
                    : 'fill-slate-200 text-slate-300'
                )}
              />
            </button>
          )
        })}
      </div>
      {showLabel && value > 0 && (
        <span className="text-sm font-medium text-slate-700 ml-1">
          {value.toFixed(1)} <span className="text-slate-400 font-normal">· {LABELS[Math.round(value)] ?? ''}</span>
        </span>
      )}
    </div>
  )
}

