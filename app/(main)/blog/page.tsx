import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { getAllPosts } from '@/lib/blog'

export const metadata: Metadata = {
  title: 'Blog',
  description:
    'Notes on renting, landlord reputation, tenant rights, and public-records research from the Vett team.',
  alternates: { canonical: '/blog' },
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function BlogIndex() {
  const posts = getAllPosts()
  return (
    <div className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-white px-7 py-16">
        <div className="mx-auto max-w-[820px]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-600">Blog</p>
          <h1 className="mt-3 font-display text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.05] tracking-tight text-slate-900">
            Reporting, research &amp; product notes
          </h1>
          <p className="mt-4 max-w-[620px] text-[15.5px] leading-relaxed text-slate-600">
            Deep-dives on how landlord reputation actually works in the US, the public records behind every
            Vett profile, tenant-rights scenarios worth knowing, and occasional updates from the team.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[820px] px-7 py-14">
        {posts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm text-slate-500">
            No posts yet — check back soon.
          </div>
        ) : (
          <div className="grid gap-5">
            {posts.map(post => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group block rounded-2xl border border-slate-200 bg-white p-6 transition-colors hover:border-navy-300"
              >
                <div className="flex flex-wrap items-center gap-2 text-[12px] text-slate-500">
                  <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
                  {post.tags?.map(t => (
                    <span key={t} className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                      {t}
                    </span>
                  ))}
                </div>
                <h2 className="mt-2 font-display text-[22px] leading-tight tracking-tight text-slate-900 transition-colors group-hover:text-navy-700">
                  {post.title}
                </h2>
                <p className="mt-2 text-[14px] leading-relaxed text-slate-600">
                  {post.excerpt ?? post.description}
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-medium text-teal-700">
                  Read the post <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
