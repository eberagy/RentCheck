import type { MetadataRoute } from 'next'
import { canonicalSiteUrl } from '@/lib/canonical-host'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = canonicalSiteUrl()

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Also robots: noindex via layout metadata: /landlord-portal,
        // /onboarding, /dashboard. They're SPA-rendered so SSR HTML is
        // a skeleton — keeping them out of robots.txt would still let
        // crawlers fetch them but the noindex meta tells Google to drop
        // them from the index.
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
