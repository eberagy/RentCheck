import sanitizeHtml from 'sanitize-html'

/**
 * Strip HTML / script content from user-submitted text.
 * Backed by sanitize-html (Node-native, no JSDOM dependency), which handles
 * cases a naive regex missed:
 *   - HTML comments (<!-- ... -->)
 *   - SVG-based XSS vectors
 *   - DOM-clobbering names
 *   - Event-handler attributes (onerror, onclick, etc.)
 *   - javascript: / data: URIs
 *   - disguised / nested tags
 * Config keeps NO tags and NO attributes so the output is always plain text.
 */
const TEXT_ONLY_CONFIG: sanitizeHtml.IOptions = {
  allowedTags: [],
  allowedAttributes: {},
  allowedSchemes: [],
  disallowedTagsMode: 'discard',
  // Strip HTML comments so `<!--` + script tricks don't survive.
  allowedSchemesByTag: {},
}

export function sanitizeText(input: string): string {
  if (typeof input !== 'string') return ''
  const clean = sanitizeHtml(input, TEXT_ONLY_CONFIG)
  return clean
    // sanitize-html can leave escaped HTML entities; decode the common ones
    // so plain apostrophes/quotes/ampersands aren't visibly mangled.
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&apos;/g, "'")
    // Collapse horizontal whitespace runs (preserve newlines for review bodies).
    .replace(/[ \t]+/g, ' ')
    // Remove null bytes.
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
