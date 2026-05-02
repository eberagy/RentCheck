import { describe, it, expect } from 'vitest'
import { sanitizeText, sanitizeStrings } from './sanitize'

describe('sanitizeText', () => {
  it('passes plain text through unchanged', () => {
    expect(sanitizeText('hello world')).toBe('hello world')
  })

  it('strips script tags entirely', () => {
    expect(sanitizeText('<script>alert(1)</script>hi')).toBe('hi')
  })

  it('strips img tags with onerror handlers', () => {
    expect(sanitizeText('<img src=x onerror="alert(1)">x')).toBe('x')
  })

  it('strips HTML comments', () => {
    expect(sanitizeText('before<!-- script -->after')).toBe('beforeafter')
  })

  it('strips javascript: URIs', () => {
    expect(sanitizeText('<a href="javascript:alert(1)">click</a>')).toBe('click')
  })

  it('decodes encoded entities back to plain characters', () => {
    expect(sanitizeText('Cathy&apos;s &amp; Co')).toBe("Cathy's & Co")
    expect(sanitizeText('5 &lt; 10')).toBe('5 < 10')
  })

  it('returns empty string for non-string input', () => {
    // @ts-expect-error
    expect(sanitizeText(null)).toBe('')
    // @ts-expect-error
    expect(sanitizeText(123)).toBe('')
  })

  it('preserves newlines but collapses horizontal whitespace', () => {
    expect(sanitizeText('first\n\n  second')).toBe('first\n\n second')
    expect(sanitizeText('  hello   world  ')).toBe('hello world')
  })

  it('removes null bytes', () => {
    expect(sanitizeText('he\0llo')).toBe('hello')
  })

  it('strips SVG-based XSS', () => {
    expect(sanitizeText('<svg onload="alert(1)">visible</svg>')).toBe('visible')
  })
})

describe('sanitizeStrings', () => {
  it('sanitizes every string property of a flat object', () => {
    const out = sanitizeStrings({
      title: '<script>x</script>real title',
      body: 'plain text',
      count: 5,
    })
    expect(out.title).toBe('real title')
    expect(out.body).toBe('plain text')
    expect(out.count).toBe(5)
  })

  it('does not recurse into nested objects', () => {
    const nested = {
      inner: { evil: '<script>x</script>' },
    }
    const out = sanitizeStrings(nested as unknown as Record<string, unknown>)
    // Nested object passed through as-is (one level deep, by design).
    expect((out.inner as { evil: string }).evil).toBe('<script>x</script>')
  })
})
