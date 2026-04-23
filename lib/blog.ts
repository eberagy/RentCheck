// Lightweight in-repo blog post registry. Keeps content under type-checking
// and avoids an MDX toolchain until volume warrants one. Post bodies live in
// app/(main)/blog/[slug]/page.tsx in a POSTS record keyed by slug. Metadata
// lives here.

export interface BlogPost {
  slug: string
  title: string
  description: string
  excerpt?: string
  author: string
  publishedAt: string // ISO8601
  tags?: string[]
}

const POSTS: BlogPost[] = [
  {
    slug: 'hello-vett',
    title: 'Why we built Vett',
    description:
      'Renters sign 12-month financial commitments with less information than a kitchen gadget on Amazon. Here\'s what we\'re doing about it.',
    excerpt:
      'Why landlord reputation is broken, what lease verification actually means on Vett, and what we\'re shipping next.',
    author: 'The Vett team',
    publishedAt: '2026-04-23',
    tags: ['product'],
  },
]

export function getAllPosts(): BlogPost[] {
  return [...POSTS].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
}

export function getPost(slug: string): BlogPost | undefined {
  return POSTS.find(p => p.slug === slug)
}
