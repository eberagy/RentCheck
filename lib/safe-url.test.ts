import { describe, it, expect } from 'vitest'
import { safeExternalUrl } from './safe-url'

describe('safeExternalUrl', () => {
  it('returns http URLs as-is', () => {
    expect(safeExternalUrl('http://example.com/')).toBe('http://example.com/')
  })

  it('returns https URLs as-is', () => {
    expect(safeExternalUrl('https://example.com/path')).toBe('https://example.com/path')
  })

  it('rejects javascript: pseudo-protocol (XSS guard)', () => {
    expect(safeExternalUrl('javascript:alert(1)')).toBeUndefined()
    expect(safeExternalUrl('JAVASCRIPT:alert(1)')).toBeUndefined()
    expect(safeExternalUrl('  javascript:alert(1)  ')).toBeUndefined()
  })

  it('rejects data: URLs (XSS / phishing vector)', () => {
    expect(safeExternalUrl('data:text/html,<script>alert(1)</script>')).toBeUndefined()
  })

  it('rejects file:, ftp:, mailto:', () => {
    expect(safeExternalUrl('file:///etc/passwd')).toBeUndefined()
    expect(safeExternalUrl('ftp://example.com/')).toBeUndefined()
    expect(safeExternalUrl('mailto:hi@example.com')).toBeUndefined()
  })

  it('returns undefined for null / undefined / empty string', () => {
    expect(safeExternalUrl(null)).toBeUndefined()
    expect(safeExternalUrl(undefined)).toBeUndefined()
    expect(safeExternalUrl('')).toBeUndefined()
  })

  it('returns undefined for unparseable garbage', () => {
    expect(safeExternalUrl('not a url')).toBeUndefined()
    expect(safeExternalUrl('http://')).toBeUndefined()
  })

  it('trims whitespace before parsing', () => {
    expect(safeExternalUrl('  https://example.com/  ')).toBe('https://example.com/')
  })

  it('non-string input returns undefined (defensive)', () => {
    expect(safeExternalUrl(123 as unknown as string)).toBeUndefined()
  })
})
