/**
 * Return `path` only if it is a safe same-origin relative URL.
 * Rejects:
 *   - Absolute URLs (http://..., https://...)
 *   - Protocol-relative URLs (//evil.com)
 *   - Anything not starting with exactly one "/"
 *   - "/\..." (encoded backslash variants that some browsers treat as protocol-relative)
 * Falls back to `fallback` (default: "/dashboard") when unsafe or empty.
 */
export function safeRedirectPath(path: string | null | undefined, fallback = '/dashboard'): string {
  if (!path || typeof path !== 'string') return fallback
  // Must start with "/" and NOT with "//" or "/\"
  if (!path.startsWith('/')) return fallback
  if (path.startsWith('//')) return fallback
  if (path.startsWith('/\\')) return fallback
  // Reject anything that parses as an absolute URL.
  try {
    // If URL parses WITHOUT a base, it's absolute → unsafe.
    new URL(path)
    return fallback
  } catch {
    // Relative path — good.
    return path
  }
}
