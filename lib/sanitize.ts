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
  // CVE-class hardening: sanitize-html's default nonTextTags list
  // doesn't include <xmp>, <noscript>, or <noframes>. With those tags
  // stripped but their *content* preserved as text, an attacker can
  // smuggle a literal "<script>" string through. React JSX text-escapes
  // by default so it's not currently exploitable in this codebase, but
  // any future raw-HTML render path would inherit the vuln. Listing
  // these here strips the whole tag + contents. Verified by the
  // regression test in sanitize.test.ts. Reference: the apostrophe/
  // sanitize-html <=2.17.3 advisory ("default XSS via `xmp` raw-text
  // passthrough").
  nonTextTags: ['style', 'script', 'textarea', 'option', 'xmp', 'noscript', 'noframes', 'iframe'],
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
