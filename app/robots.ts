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
        // Block AI training + on-demand scrapers. The original list was
        // stale (anthropic-ai/Claude-Web are legacy UAs); this version
        // covers the canonical 2026 set.
        //
        //   OpenAI   — GPTBot (training), ChatGPT-User (on-demand),
        //              OAI-SearchBot (SearchGPT index)
        //   Anthropic — ClaudeBot (training, current primary),
        //              anthropic-ai / Claude-Web (legacy),
        //              Claude-User (on-demand), Claude-SearchBot
        //   Google AI — Google-Extended (Gemini training opt-out token)
        //   CommonCrawl — CCBot (used by many trainers)
        //   ByteDance  — Bytespider
        //   Perplexity — PerplexityBot (training), Perplexity-User
        //   Apple      — Applebot-Extended (Apple Intelligence opt-out)
        //   Meta       — Meta-ExternalAgent, Meta-ExternalFetcher
        //   Diffbot    — Diffbot
        userAgent: [
          'GPTBot',
          'ChatGPT-User',
          'OAI-SearchBot',
          'ClaudeBot',
          'anthropic-ai',
          'Claude-Web',
          'Claude-User',
          'Claude-SearchBot',
          'Google-Extended',
          'CCBot',
          'Bytespider',
          'PerplexityBot',
          'Perplexity-User',
          'Applebot-Extended',
          'Meta-ExternalAgent',
          'Meta-ExternalFetcher',
          'Diffbot',
        ],
        disallow: '/',
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}
