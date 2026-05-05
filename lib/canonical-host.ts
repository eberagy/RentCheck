// Canonical-host helper. Single source of truth for the www-forcing
// fix originally added to app/robots.ts and app/sitemap.ts.
//
// Why this exists: NEXT_PUBLIC_SITE_URL is misconfigured in Vercel as
// the bare apex (https://vettrentals.com) instead of the www subdomain.
// The apex 307s to www on every request, which means every URL we
// emit (OG image src, canonical tag, sitemap entry, robots.txt host)
// becomes a redirect for crawlers and clients. This helper rewrites
// the bare apex to www so we don't depend on the env var being right.
//
// Once the Vercel env var is fixed, this helper becomes a no-op.

const FALLBACK = 'https://www.vettrentals.com'

export function canonicalSiteUrl(): string {
  // Treat null / undefined / empty string identically — all mean "use fallback"
  const raw = process.env.NEXT_PUBLIC_SITE_URL || FALLBACK
  return raw.replace(/^(https?:\/\/)(?!www\.)vettrentals\.com/, '$1www.vettrentals.com')
}
