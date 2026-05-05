// URL-shape guards used by middleware to reject typo'd URLs at the edge.
// Pulled out of supabase/middleware.ts so the regex envelopes can be unit-
// tested independently of the auth + origin chain.
//
// Why a hard 404 at the edge: Next.js's notFound() inside generateMetadata +
// page returns the not-found body with a 200 status (App Router quirk). That
// soft-404s every typo'd URL into search-engine indexes and burns crawl
// budget. These guards short-circuit at the edge before any DB hit.

/** Property URLs must carry a v4-shaped UUID. */
export const UUID_RE = /^\/property\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(\/|$)/i

/**
 * Landlord slugs follow `{name-parts}-{city}-{4-char-hash}` and are 8–84
 * chars of [a-z0-9-]. Anything outside that envelope is a typo. (Probed
 * live 2026-05-04: all 27,049 slugs match.)
 */
export const LANDLORD_SLUG_RE = /^\/landlord\/([a-z0-9][a-z0-9-]{6,82}[a-z0-9])(\/|$)/i

/** City paths use a real 2-letter US state code + a slugged city. */
export const CITY_RE = /^\/city\/([a-z]{2})\/([a-z0-9-]+)(\/|$)/i

/** Closed set — 50 states + DC. */
export const US_STATE_CODES = new Set([
  'al','ak','az','ar','ca','co','ct','de','fl','ga','hi','id','il','in','ia',
  'ks','ky','la','me','md','ma','mi','mn','ms','mo','mt','ne','nv','nh','nj',
  'nm','ny','nc','nd','oh','ok','or','pa','ri','sc','sd','tn','tx','ut','vt',
  'va','wa','wv','wi','wy','dc',
])

/** True when a /property/* URL should pass through to the page handler. */
export function isValidPropertyPath(pathname: string): boolean {
  return UUID_RE.test(pathname)
}

/** True when a /landlord/* URL should pass through. */
export function isValidLandlordPath(pathname: string): boolean {
  return LANDLORD_SLUG_RE.test(pathname)
}

/** Bare-slug variant for use inside [slug] page handlers, where you only
 * have the segment value, not the full pathname. */
export function isValidLandlordSlug(slug: string): boolean {
  return isValidLandlordPath(`/landlord/${slug}`)
}

/** Bare-id variant for /property/[id] page handlers. */
export function isValidPropertyId(id: string): boolean {
  return isValidPropertyPath(`/property/${id}`)
}

/** True when a /city/<state>/<city> URL should pass through. */
export function isValidCityPath(pathname: string): boolean {
  const m = pathname.match(CITY_RE)
  if (!m) return false
  return US_STATE_CODES.has(m[1]!.toLowerCase())
}
