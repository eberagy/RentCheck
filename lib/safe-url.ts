/**
 * Returns the URL only if it parses as a safe http/https external link.
 * Defense against stored-XSS via `javascript:`, `data:`, `file:` URLs in
 * user-controlled fields like landlords.website.
 *
 * Zod's `.url()` validator accepts ANY parseable URL (including
 * javascript:alert(1)), so callers should both validate at write-time
 * AND wrap href= attributes with this helper at render-time.
 *
 * Returns undefined for unsafe / unparseable input so the caller can
 * conditionally render (`{href && <a href={href}>...}`).
 */
export function safeExternalUrl(url: string | null | undefined): string | undefined {
  if (!url || typeof url !== 'string') return undefined
  try {
    const u = new URL(url.trim())
    if (u.protocol === 'http:' || u.protocol === 'https:') return u.toString()
    return undefined
  } catch {
    return undefined
  }
}
