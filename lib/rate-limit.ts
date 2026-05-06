/**
 * Simple in-memory sliding-window rate limiter.
 * Good enough for single-instance deployments (Vercel serverless resets per invocation,
 * but cold starts + short-lived containers still provide some protection).
 *
 * For production at scale, swap to @upstash/ratelimit + Redis.
 */

const store = new Map<string, number[]>()

// Periodic cleanup to prevent memory leaks
setInterval(() => {
  const now = Date.now()
  store.forEach((timestamps, key) => {
    const filtered = timestamps.filter(t => now - t < 120_000)
    if (filtered.length === 0) store.delete(key)
    else store.set(key, filtered)
  })
}, 60_000)

interface RateLimitResult {
  success: boolean
  remaining: number
  /** Seconds until the oldest in-window timestamp expires. Use to set
   * a tight Retry-After when surfacing a 429. */
  retryAfter: number
}

/**
 * Check if a request should be rate-limited.
 * @param key - Unique identifier (e.g., `reviews:${userId}`)
 * @param limit - Max requests allowed in the window
 * @param windowMs - Time window in milliseconds (default: 60s)
 */
export function rateLimit(key: string, limit: number, windowMs = 60_000): RateLimitResult {
  const now = Date.now()
  const timestamps = store.get(key) ?? []
  const windowStart = now - windowMs
  const recent = timestamps.filter(t => t > windowStart)

  if (recent.length >= limit) {
    // Oldest timestamp + windowMs = when one slot frees up. Round up so
    // the client doesn't retry one second too early.
    const oldest = recent[0] ?? now
    const retryAfter = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000))
    return { success: false, remaining: 0, retryAfter }
  }

  recent.push(now)
  store.set(key, recent)
  return { success: true, remaining: limit - recent.length, retryAfter: 0 }
}

/**
 * Returns a 429 JSON response for rate-limited requests.
 *
 * Pass the RateLimitResult so the Retry-After header is calibrated to the
 * caller's window — e.g. a 1-hour window where 5 requests are spent should
 * tell the client to wait closer to 3600s, not the legacy default of 60s.
 * If no result is passed (older call sites), defaults to 60s.
 */
export function rateLimitResponse(result?: RateLimitResult) {
  const retryAfterSeconds = result?.retryAfter ?? 60
  return new Response(
    JSON.stringify({ error: 'Too many requests. Please try again later.' }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfterSeconds),
      },
    }
  )
}
