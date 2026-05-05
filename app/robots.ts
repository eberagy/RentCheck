import type { MetadataRoute } from 'next'
import { canonicalSiteUrl } from '@/lib/canonical-host'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = canonicalSiteUrl()

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
