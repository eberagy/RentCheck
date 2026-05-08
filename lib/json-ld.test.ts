import { describe, it, expect } from 'vitest'
import { jsonLdSafe } from './json-ld'

describe('jsonLdSafe', () => {
  it('returns valid JSON for normal content', () => {
    expect(jsonLdSafe({ name: 'Acme Properties LLC' }))
      .toBe('{"name":"Acme Properties LLC"}')
  })

  it('escapes </script> inside string values (XSS guard)', () => {
    const out = jsonLdSafe({ name: 'Bad</script><script>alert(1)</script>' })
    // Browser sees the </script> as escaped text, not a tag close.
    expect(out).not.toMatch(/<\/script>/)
    expect(out).toMatch(/<\\\/script>/)
    // Still valid JSON — JSON.parse should round-trip.
    expect(JSON.parse(out).name).toBe('Bad</script><script>alert(1)</script>')
  })

  it('matches case-insensitively (</SCRIPT>, </Script>)', () => {
    expect(jsonLdSafe({ x: '</SCRIPT>' })).not.toMatch(/<\/SCRIPT>/)
    expect(jsonLdSafe({ x: '</Script>' })).not.toMatch(/<\/Script>/)
  })

  it('escapes U+2028 / U+2029 (legacy script-terminator chars)', () => {
    const out = jsonLdSafe({ x: 'line1 line2 line3' })
    expect(out).toContain('\\u2028')
    expect(out).toContain('\\u2029')
    expect(JSON.parse(out).x).toBe('line1 line2 line3')
  })

  it('handles nested objects with malicious content', () => {
    const out = jsonLdSafe({
      review: {
        author: { name: '</script><img src=x onerror=alert(1)>' },
        text: 'Normal review content',
      },
    })
    expect(out).not.toMatch(/<\/script>/)
    expect(JSON.parse(out).review.author.name).toBe('</script><img src=x onerror=alert(1)>')
  })

  it('returns a string for primitive values', () => {
    expect(jsonLdSafe('hello')).toBe('"hello"')
    expect(jsonLdSafe(42)).toBe('42')
    expect(jsonLdSafe(null)).toBe('null')
    expect(jsonLdSafe(true)).toBe('true')
  })
})
