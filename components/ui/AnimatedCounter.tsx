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
  // SSR + first-paint render the target value directly. We don't reset to
  // 0 on hydration — that caused offscreen counters to flash "0" until
  // the user scrolled to them. Animation only triggers when (a) the
  // element is below the fold AND (b) the user scrolls it into view.
  const [count, setCount] = useState(target)
  const ref = useRef<HTMLSpanElement>(null)
  const animatedRef = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const el = ref.current
    if (!el) return

    // If already in view at first paint, leave the SSR target alone.
    const inView = el.getBoundingClientRect().top < window.innerHeight
    if (inView) {
      animatedRef.current = true
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry?.isIntersecting || animatedRef.current) return
        animatedRef.current = true
        // Reset RIGHT BEFORE animating so the user sees the count-up.
        // Doing it here (not on hydration) avoids the flash-to-zero on
        // offscreen counters.
        setCount(0)
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
      },
      { threshold: 0.3 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [target, duration])

  // Pin to en-US so SSR (Node, defaults to en-US) and CSR (browser locale)
  // produce identical output. Without the locale arg, a German visitor
  // would get "5.000" client-side vs "5,000" server-side and React would
  // throw a hydration mismatch warning.
  const formatted = separator ? count.toLocaleString('en-US') : String(count)

  return (
    <span
      ref={ref}
      className={className}
      // The number animates 0 → target over ~2s, which would make
      // any aria-live region above this read every intermediate
      // value. aria-live="off" pins it: SR users hear the number
      // once when they encounter it, not every frame.
      aria-live="off"
      aria-atomic="true"
    >
      {prefix}{formatted}{suffix}
    </span>
  )
}
