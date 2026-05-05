import { describe, it, expect } from 'vitest'
import { getAllScenarios, getScenario } from './rights-scenarios'

describe('rights-scenarios', () => {
  it('returns at least one scenario', () => {
    const scenarios = getAllScenarios()
    expect(scenarios.length).toBeGreaterThan(0)
  })

  it('every scenario has slug, title, summary, and at least one section', () => {
    for (const s of getAllScenarios()) {
      expect(s.slug).toMatch(/^[a-z0-9-]+$/)
      expect(s.title.length).toBeGreaterThan(0)
      expect(s.summary.length).toBeGreaterThan(0)
      expect(s.sections.length).toBeGreaterThan(0)
      for (const section of s.sections) {
        expect(section.heading.length).toBeGreaterThan(0)
        expect(section.body.length).toBeGreaterThan(0)
      }
    }
  })

  it('every scenario has at least one resource link', () => {
    for (const s of getAllScenarios()) {
      expect(s.resources.length).toBeGreaterThan(0)
      for (const r of s.resources) {
        expect(r.label.length).toBeGreaterThan(0)
        expect(r.href).toMatch(/^https?:\/\//)
      }
    }
  })

  it('slugs are unique (no SEO collisions)', () => {
    const slugs = getAllScenarios().map(s => s.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('getScenario returns the matching entry', () => {
    const all = getAllScenarios()
    const first = all[0]!
    const found = getScenario(first.slug)
    expect(found).toBeDefined()
    expect(found?.slug).toBe(first.slug)
  })

  it('getScenario returns undefined for unknown slugs', () => {
    expect(getScenario('does-not-exist')).toBeUndefined()
    expect(getScenario('')).toBeUndefined()
  })
})
