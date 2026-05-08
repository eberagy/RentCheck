import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getPost, getAllPosts } from '@/lib/blog'
import { canonicalSiteUrl } from '@/lib/canonical-host'
import { jsonLdSafe } from '@/lib/json-ld'

interface BlogPostPageProps {
  params: Promise<{ slug: string }>
}

// Posts are file-system backed (lib/blog reads MDX from /content), so the
// set is closed at build. revalidate guards against late edits / new posts
// landing without a redeploy — the daily refresh picks them up on the next
// hit after 24h.
export const revalidate = 86400

export async function generateStaticParams() {
  return getAllPosts().map(p => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const p = await params
  const post = getPost(p.slug)
  if (!post) notFound()
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.description,
      publishedTime: post.publishedAt,
      authors: [post.author],
    },
  }
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

// Post content registry. One React component per slug. Keeps the whole blog
// under type-checking without adding an MDX toolchain.
const POSTS: Record<string, () => React.ReactNode> = {
  'hello-vett': () => (
    <>
      <p>
        Renters sign 12-month financial commitments with less information than a twenty-dollar kitchen gadget
        gets on Amazon. Landlord reputation lives in scattered Reddit threads, city websites that only a
        paralegal can navigate, and word-of-mouth that doesn&apos;t travel across neighborhoods. The result is
        predictable: the same buildings rack up the same complaints year after year, and the next renter walks
        in unarmed.
      </p>
      <p>
        Vett exists to close that gap. Every review on the platform is tied to a real lease agreement, manually
        verified by our team before it publishes. Every landlord profile layers in public records from 50+
        government APIs &mdash; housing violations, eviction filings, court cases, assessor data &mdash; so the
        complaints have context and the good landlords can&apos;t be drowned by loud voices.
      </p>
      <h2>Why now</h2>
      <p>
        The FTC began enforcing its Consumer Review Rule in December 2025, and a wave of review-site lawsuits
        has forced the industry to finally document verification methodology. For Vett, that documentation
        isn&apos;t defensive &mdash; it&apos;s the product.
      </p>
      <h2>What&apos;s next</h2>
      <p>
        We&apos;re heads-down on three things:
      </p>
      <ul>
        <li>
          <strong>More cities.</strong> We ship data pipelines weekly. If your city isn&apos;t covered yet,
          drop your email on the homepage and we&apos;ll tell you the moment it goes live.
        </li>
        <li>
          <strong>Landlord-response tooling.</strong> Verified landlords can reply to reviews publicly. Good
          landlords benefit from being visible; bad ones benefit from showing their work.
        </li>
        <li>
          <strong>The Vett Index.</strong> An annual data report on America&apos;s worst-performing landlords
          outside NYC &mdash; using the same public records every tenant-rights lawyer already cites, just
          made searchable.
        </li>
      </ul>
      <p>
        Thanks for being here early.
      </p>
    </>
  ),
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const p = await params
  const post = getPost(p.slug)
  if (!post) notFound()

  const Content = POSTS[post.slug]
  const siteUrl = canonicalSiteUrl()

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    author: { '@type': 'Organization', name: post.author },
    publisher: {
      '@type': 'Organization',
      '@id': `${siteUrl}/#organization`,
      name: 'Vett',
      url: siteUrl,
    },
    mainEntityOfPage: `${siteUrl}/blog/${post.slug}`,
  }

  // Breadcrumb: Home → Blog → {post title}. Matches the same shape as
  // /property/[id] and /landlord/[slug] so Google's sitelink heuristics
  // see one consistent breadcrumb pattern across the site.
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${siteUrl}/blog` },
      { '@type': 'ListItem', position: 3, name: post.title, item: `${siteUrl}/blog/${post.slug}` },
    ],
  }

  return (
    <div className="min-h-screen bg-white">
      <script type="application/ld+json" suppressHydrationWarning>
        {jsonLdSafe(articleJsonLd)}
      </script>
      <script type="application/ld+json" suppressHydrationWarning>
        {jsonLdSafe(breadcrumbJsonLd)}
      </script>
      <article className="mx-auto max-w-[720px] px-7 py-14">
        <Link href="/blog" className="mb-6 inline-flex items-center gap-1.5 text-[13px] text-slate-500 hover:text-slate-700 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500 focus-visible:ring-offset-2">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Back to blog
        </Link>
        <div className="flex flex-wrap items-center gap-2 text-[12px] text-slate-500">
          <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
          {post.tags?.map(t => (
            <span key={t} className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">{t}</span>
          ))}
        </div>
        <h1 className="mt-2 font-display text-[clamp(2rem,4vw,3rem)] leading-[1.08] tracking-tight text-slate-900">
          {post.title}
        </h1>
        <p className="mt-2 text-[14px] text-slate-500">By {post.author}</p>
        <div className="prose prose-slate prose-lg mt-8 max-w-none prose-p:leading-[1.7] prose-h2:font-display prose-h2:tracking-tight prose-h2:text-slate-900 prose-li:text-slate-700 prose-a:text-teal-700">
          {Content ? <Content /> : <p>This post doesn&apos;t have any body content yet.</p>}
        </div>
      </article>
    </div>
  )
}
