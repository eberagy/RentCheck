import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'
import { COLLEGE_CITIES } from '@/types'

export const revalidate = 3600

function citySlug(city: string) {
  return city.toLowerCase().replace(/\s+/g, '-')
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://rentcheck.app'
  const supabase = await createClient()

  const [
    { data: landlords },
    { data: properties },
  ] = await Promise.all([
    supabase.from('landlords').select('slug, updated_at').order('review_count', { ascending: false }).limit(5000),
    supabase.from('properties').select('id, updated_at').order('review_count', { ascending: false }).limit(5000),
  ])

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/search`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/about`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/faq`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/contact`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/rights`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/add-landlord`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/landlord-portal`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/terms`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/privacy`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/fcra-notice`, changeFrequency: 'monthly', priority: 0.3 },
  ]

  // State tenant rights pages
  const statePages: MetadataRoute.Sitemap = [
    'md', 'pa', 'sc', 'ny', 'ca', 'il', 'tx', 'wa', 'ma',
    'fl', 'ga', 'nc', 'va', 'oh', 'mi', 'co', 'az', 'nv', 'or',
  ].map(state => ({
    url: `${baseUrl}/rights/${state}`,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  // College city pages
  const cityPages: MetadataRoute.Sitemap = COLLEGE_CITIES.map(entry => ({
    url: `${baseUrl}/city/${entry.state.toLowerCase()}/${citySlug(entry.city)}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  // Landlord pages
  const landlordPages: MetadataRoute.Sitemap = (landlords ?? []).map(l => ({
    url: `${baseUrl}/landlord/${l.slug}`,
    lastModified: l.updated_at ? new Date(l.updated_at) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  // Property pages
  const propertyPages: MetadataRoute.Sitemap = (properties ?? []).map(p => ({
    url: `${baseUrl}/property/${p.id}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }))

  return [...staticPages, ...statePages, ...cityPages, ...landlordPages, ...propertyPages]
}
