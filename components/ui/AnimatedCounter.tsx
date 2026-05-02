'use client'

import { useEffect, useRef, useState } from 'react'

interface AnimatedCounterProps {
  target: number
  duration?: number
  className?: string
  prefix?: string
  suffix?: string
  separator?: boolean
}

export function AnimatedCounter({
  target,
  duration = 2000,
  className,
  prefix = '',
  suffix = '',
  separator = true,
}: AnimatedCounterProps) {
  const [count, setCount] = useState(target)
  const [hasAnimated, setHasAnimated] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setHasAnimated(true)
      return
    }
    const el = ref.current
    if (!el) return

    // Only reset to 0 when the element will actually animate.
    // Otherwise we'd flash target → 0 before the IntersectionObserver
    // fires, causing a visible "0" pop on first paint.
    const inView = el.getBoundingClientRect().top < window.innerHeight
    if (!inView) setCount(0)

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry?.isIntersecting && !hasAnimated) {
          setHasAnimated(true)
          // If we're already in view at first paint we kept the target value;
          // animation kicks off from 0 only when we genuinely need to.
          if (count > 0 && count === target) return

          const startTime = performance.now()
          const step = (now: number) => {
            const elapsed = now - startTime
            const progress = Math.min(elapsed / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3)
            setCount(Math.floor(eased * target))
            if (progress < 1) requestAnimationFrame(step)
            else setCount(target)
          }
          requestAnimationFrame(step)
        }
      },
      { threshold: 0.3 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [target, duration, hasAnimated])

  const formatted = separator ? count.toLocaleString() : String(count)

  return (
    <span ref={ref} className={className}>
      {prefix}{formatted}{suffix}
    </span>
  )
}
