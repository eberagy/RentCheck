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
  /** Forward-pass through to the radiogroup so callers can wire up form errors. */
  ariaInvalid?: boolean
  ariaDescribedBy?: string
}

const LABELS = ['', 'Very Poor', 'Poor', 'Fair', 'Good', 'Excellent']
const SIZES = { sm: 'h-3 w-3', md: 'h-5 w-5', lg: 'h-7 w-7' }

export function StarRating({ value, onChange, readonly = false, size = 'md', showLabel = false, ariaInvalid, ariaDescribedBy }: StarRatingProps) {
  const [hovered, setHovered] = useState(0)
  const display = readonly ? value : (hovered || value)
  const starSize = SIZES[size]

  // Read-only path renders as a single role="img" so screen readers
  // announce "Rated 4 out of 5 stars" once instead of "1 star, button,
  // disabled" five times. Used on landlord cards / search results /
  // anywhere the rating is informational, not interactive — the prior
  // version was producing five disabled buttons per card on every
  // listing page.
  if (readonly) {
    return (
      <div className="flex items-center gap-1">
        <div
          className="flex items-center gap-0.5"
          role="img"
          aria-label={value > 0 ? `Rated ${value.toFixed(1)} out of 5 stars` : 'No rating yet'}
        >
          {[1, 2, 3, 4, 5].map(star => {
            const filled = star <= value
            const halfFilled = !filled && star - 0.5 <= value
            return (
              <Star
                key={star}
                aria-hidden="true"
                className={cn(
                  starSize,
                  filled
                    ? 'fill-amber-400 text-amber-400'
                    : halfFilled
                      ? 'fill-amber-200 text-amber-400'
                      : 'fill-slate-200 text-slate-300',
                )}
              />
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

  // Interactive path: the buttons are real action targets. Wrap in a
  // radiogroup so SR users get "1 of 5" / "2 of 5" relative position
  // announcements rather than 5 detached buttons.
  return (
    <div className="flex items-center gap-1">
      <div
        className="flex items-center gap-0.5"
        role="radiogroup"
        aria-label="Rating"
        aria-invalid={ariaInvalid || undefined}
        aria-describedby={ariaDescribedBy}
      >
        {[1, 2, 3, 4, 5].map(star => {
          const filled = star <= display
          const halfFilled = !filled && star - 0.5 <= display
          return (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={star === value}
              onClick={() => onChange?.(star)}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              className={cn(
                'transition-transform rounded-sm',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2',
                'hover:scale-110 cursor-pointer',
              )}
              aria-label={`${star} star${star !== 1 ? 's' : ''}`}
            >
              <Star
                aria-hidden="true"
                className={cn(
                  starSize,
                  'transition-colors',
                  filled
                    ? 'fill-amber-400 text-amber-400'
                    : halfFilled
                      ? 'fill-amber-200 text-amber-400'
                      : 'fill-slate-200 text-slate-300',
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

