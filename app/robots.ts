import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  // Live site serves on www.vettrentals.com; the apex redirects 307 → www.
  // Force www even when NEXT_PUBLIC_SITE_URL is set to the bare apex
  // (a known prod misconfiguration) so search engines don't see a
  // redirect on every URL and we don't burn crawl budget.
  const raw = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.vettrentals.com'
  const baseUrl = raw.replace(/^(https?:\/\/)(?!www\.)vettrentals\.com/, '$1www.vettrentals.com')

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // /landlord-portal and /landlord-portal/claim are public
        // marketing pages; only the authenticated subpaths are private.
        disallow: ['/admin/', '/dashboard/', '/api/', '/auth/'],
      },
      {
        // Block AI training scrapers
        userAgent: ['GPTBot', 'ChatGPT-User', 'CCBot', 'anthropic-ai', 'Claude-Web'],
        disallow: '/',
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}
