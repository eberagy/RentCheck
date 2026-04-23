import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'
import { COLLEGE_CITIES } from '@/types'
import { getAllPosts } from '@/lib/blog'

export const revalidate = 3600

// Google's per-sitemap limit is 50k URLs / 50MB. Vett currently has ~21k
// landlords and a few thousand properties — well under the threshold.
// If we ever grow past 50k, swap to the Next.js `generateSitemaps` sharding
// pattern (docs: https://nextjs.org/docs/app/api-reference/functions/generate-sitemaps).
const MAX_URLS_PER_SET = 50_000

function citySlug(city: string) {
  return city.toLowerCase().replace(/\s+/g, '-')
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://vettrentals.com'
  const supabase = await createClient()

  const [
    { data: landlords },
    { data: properties },
  ] = await Promise.all([
    supabase.from('landlords').select('slug, updated_at').order('review_count', { ascending: false }).limit(MAX_URLS_PER_SET),
    supabase.from('properties').select('id, updated_at').order('review_count', { ascending: false }).limit(MAX_URLS_PER_SET),
  ])

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily' },
    { url: `${baseUrl}/search`, changeFrequency: 'daily' },
    { url: `${baseUrl}/about`, changeFrequency: 'monthly' },
    { url: `${baseUrl}/faq`, changeFrequency: 'monthly' },
    { url: `${baseUrl}/contact`, changeFrequency: 'monthly' },
    { url: `${baseUrl}/rights`, changeFrequency: 'monthly' },
    { url: `${baseUrl}/add-landlord`, changeFrequency: 'monthly' },
    { url: `${baseUrl}/landlord-portal`, changeFrequency: 'monthly' },
    { url: `${baseUrl}/terms`, changeFrequency: 'monthly' },
    { url: `${baseUrl}/privacy`, changeFrequency: 'monthly' },
    { url: `${baseUrl}/fcra-notice`, changeFrequency: 'monthly' },
    { url: `${baseUrl}/blog`, changeFrequency: 'weekly' },
  ]

  const blogPages: MetadataRoute.Sitemap = getAllPosts().map(post => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.publishedAt),
    changeFrequency: 'monthly' as const,
  }))

  const statePages: MetadataRoute.Sitemap = [
    'md', 'pa', 'sc', 'ny', 'ca', 'il', 'tx', 'wa', 'ma',
    'fl', 'ga', 'nc', 'va', 'oh', 'mi', 'co', 'az', 'nv', 'or',
  ].map(state => ({
    url: `${baseUrl}/rights/${state}`,
    changeFrequency: 'monthly' as const,
  }))

  const cityPages: MetadataRoute.Sitemap = COLLEGE_CITIES.map(entry => ({
    url: `${baseUrl}/city/${entry.state.toLowerCase()}/${citySlug(entry.city)}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
  }))

  const landlordPages: MetadataRoute.Sitemap = (landlords ?? []).map(l => ({
    url: `${baseUrl}/landlord/${l.slug}`,
    lastModified: l.updated_at ? new Date(l.updated_at) : new Date(),
    changeFrequency: 'weekly' as const,
  }))

  const propertyPages: MetadataRoute.Sitemap = (properties ?? []).map(p => ({
    url: `${baseUrl}/property/${p.id}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
    changeFrequency: 'weekly' as const,
  }))

  return [...staticPages, ...blogPages, ...statePages, ...cityPages, ...landlordPages, ...propertyPages]
}
