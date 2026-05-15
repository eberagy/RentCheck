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
    // @ts-expect-error testing runtime guard against non-string input
    expect(sanitizeText(null)).toBe('')
    // @ts-expect-error testing runtime guard against non-string input
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

  // CVE-class regression guard. sanitize-html <=2.17.3 has an unpatched
  // advisory (GHSA: "Apostrophe has default XSS via `xmp` raw-text
  // passthrough"). Our TEXT_ONLY_CONFIG strips ALL tags, so the xmp
  // raw-text container shouldn't survive — but the parser oddities that
  // motivate the advisory could regress in a future bump. Pin the
  // expected behavior here so an upstream change breaks loudly.
  it('strips xmp raw-text containers entirely (CVE-class regression guard)', () => {
    expect(sanitizeText('<xmp><script>alert(1)</script></xmp>visible')).toBe('visible')
    expect(sanitizeText('<XMP><img src=x onerror=alert(1)></XMP>after')).toBe('after')
  })

  // Defense-in-depth on a few more obscure XSS vectors that show up
  // in OWASP cheat sheets but have historically tripped up tag-stripping
  // libraries:
  it('strips noscript + iframe + object + embed payloads', () => {
    expect(sanitizeText('<noscript><script>x</script></noscript>kept')).toBe('kept')
    expect(sanitizeText('<iframe src="javascript:alert(1)"></iframe>kept')).toBe('kept')
    expect(sanitizeText('<object data="javascript:alert(1)"></object>kept')).toBe('kept')
    expect(sanitizeText('<embed src="javascript:alert(1)">kept')).toBe('kept')
  })

  it('strips data: URIs even with creative casing', () => {
    expect(sanitizeText('<a href="DATA:text/html,<script>x</script>">kept</a>')).toBe('kept')
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
