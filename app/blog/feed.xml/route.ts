import { NextResponse } from 'next/server'
import { getAllPosts } from '@/lib/blog'
import { canonicalSiteUrl } from '@/lib/canonical-host'

// RSS 2.0 feed for the Vett blog. Keeps post-discovery alive in
// readers (Inoreader, Feedly, NetNewsWire) without depending on
// search-engine indexation. ISR-cached for an hour to match the
// post pages themselves.
export const revalidate = 3600

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function GET() {
  const siteUrl = canonicalSiteUrl()
  const posts = getAllPosts()

  // RSS 2.0 best-practice: surface lastBuildDate at the channel level
  // so feed readers (Inoreader, Feedly) can short-circuit re-fetching
  // when nothing new has shipped. Use the newest post's publish date —
  // getAllPosts returns newest-first.
  const lastBuildDate = posts[0]
    ? new Date(posts[0].publishedAt).toUTCString()
    : new Date().toUTCString()

  const items = posts.map(post => `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${siteUrl}/blog/${post.slug}</link>
      <guid>${siteUrl}/blog/${post.slug}</guid>
      <pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>
      <description>${escapeXml(post.description)}</description>
      <author>noreply@vettrentals.com (${escapeXml(post.author)})</author>
    </item>`).join('')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Vett Blog</title>
    <link>${siteUrl}/blog</link>
    <description>Reporting, research, and product notes from the Vett team. Renting, landlord reputation, tenant rights, public-records research.</description>
    <language>en-US</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${siteUrl}/blog/feed.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
