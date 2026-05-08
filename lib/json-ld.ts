/**
 * Safely serialize a value for embedding inside an inline
 * <script type="application/ld+json"> tag.
 *
 * The XSS vector this defends against:
 *   {"name": "Bad Guy</script><script>alert(1)</script>"}
 *
 * Without escaping, the literal `</script>` inside the JSON string would
 * close the surrounding <script> tag prematurely, letting the rest of
 * the JSON render as HTML/JS. Stored content (landlord names, review
 * titles, addresses pulled from gov data) is the realistic attack
 * surface — any of them could contain the magic string.
 *
 * The fix is the well-known JSON-in-script-tag trick: replace `</` with
 * `<\/` after stringify. The escaped sequence is still valid JSON (a
 * string literal escape) but no longer parses as a tag close to HTML.
 *
 * Reference: OWASP "JSON in Script Tag" XSS pattern, used by React's
 * inline-script serializer and by Next.js's own __NEXT_DATA__ blob.
 */
export function jsonLdSafe(value: unknown): string {
  return JSON.stringify(value)
    .replace(/<\/(script)/gi, "<\\/$1")
    // Also escape U+2028 / U+2029 — some legacy JS parsers treat them as
    // line terminators, which can break JSON-in-script-tag inline embeds.
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029")
}
