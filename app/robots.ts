import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  // Live site serves on www.vettrentals.com; the apex redirects 307 → www.
  // Use the canonical host so search engines don't see a redirect on every URL.
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.vettrentals.com'

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
