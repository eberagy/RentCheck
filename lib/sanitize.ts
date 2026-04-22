/**
 * Strip HTML tags and dangerous characters from user-submitted text.
 * Lightweight — no dependencies required. For server-side use in API routes.
 */
export function sanitizeText(input: string): string {
  return input
    // Strip all HTML tags
    .replace(/<[^>]*>/g, '')
    // Collapse multiple whitespace (but preserve newlines for review bodies)
    .replace(/[ \t]+/g, ' ')
    // Remove null bytes
    .replace(/\0/g, '')
    .trim()
}

/**
 * Sanitize all string values in an object (shallow, one level deep).
 */
export function sanitizeStrings<T extends Record<string, unknown>>(obj: T): T {
  const result = { ...obj }
  for (const key in result) {
    if (typeof result[key] === 'string') {
      ;(result as Record<string, unknown>)[key] = sanitizeText(result[key] as string)
    }
  }
  return result
}
