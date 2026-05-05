import { describe, it, expect } from 'vitest'
import { getAllPosts, getPost } from './blog'

describe('blog', () => {
  it('returns at least one post', () => {
    expect(getAllPosts().length).toBeGreaterThan(0)
  })

  it('every post has well-formed metadata', () => {
    for (const post of getAllPosts()) {
      expect(post.slug).toMatch(/^[a-z0-9-]+$/)
      expect(post.title.length).toBeGreaterThan(0)
      expect(post.description.length).toBeGreaterThan(0)
      expect(post.author.length).toBeGreaterThan(0)
      // ISO date that parses
      expect(new Date(post.publishedAt).toString()).not.toBe('Invalid Date')
    }
  })

  it('slugs are unique (one URL per post)', () => {
    const slugs = getAllPosts().map(p => p.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('returns posts sorted newest-first', () => {
    const posts = getAllPosts()
    for (let i = 0; i < posts.length - 1; i++) {
      const a = new Date(posts[i]!.publishedAt).getTime()
      const b = new Date(posts[i + 1]!.publishedAt).getTime()
      expect(a).toBeGreaterThanOrEqual(b)
    }
  })

  it('getPost returns the matching entry', () => {
    const first = getAllPosts()[0]!
    expect(getPost(first.slug)?.slug).toBe(first.slug)
  })

  it('getPost returns undefined for unknown slugs', () => {
    expect(getPost('does-not-exist')).toBeUndefined()
  })
})
