import { describe, it, expect } from 'vitest'
import { safeRedirectPath } from './safe-redirect'

describe('safeRedirectPath', () => {
  it('passes through a normal in-app path', () => {
    expect(safeRedirectPath('/dashboard')).toBe('/dashboard')
    expect(safeRedirectPath('/landlord/abc-123')).toBe('/landlord/abc-123')
  })

  it('falls back when path is null, undefined, or empty', () => {
    expect(safeRedirectPath(null)).toBe('/dashboard')
    expect(safeRedirectPath(undefined)).toBe('/dashboard')
    expect(safeRedirectPath('')).toBe('/dashboard')
  })

  it('uses the custom fallback when provided', () => {
    expect(safeRedirectPath(null, '/login')).toBe('/login')
    expect(safeRedirectPath('https://evil.com', '/home')).toBe('/home')
  })

  it('rejects absolute URLs (http / https)', () => {
    expect(safeRedirectPath('https://evil.com/dashboard')).toBe('/dashboard')
    expect(safeRedirectPath('http://localhost:3000')).toBe('/dashboard')
  })

  it('rejects protocol-relative URLs', () => {
    expect(safeRedirectPath('//evil.com')).toBe('/dashboard')
    expect(safeRedirectPath('//evil.com/path')).toBe('/dashboard')
  })

  it('rejects encoded-backslash protocol-relative tricks', () => {
    expect(safeRedirectPath('/\\evil.com')).toBe('/dashboard')
  })

  it('rejects paths that do not start with /', () => {
    expect(safeRedirectPath('dashboard')).toBe('/dashboard')
    expect(safeRedirectPath('javascript:alert(1)')).toBe('/dashboard')
    expect(safeRedirectPath('data:text/html,<script>')).toBe('/dashboard')
  })

  it('rejects non-string inputs', () => {
    // @ts-expect-error — caller may pass arbitrary values from query params
    expect(safeRedirectPath(123)).toBe('/dashboard')
    // @ts-expect-error — same
    expect(safeRedirectPath({ url: '/x' })).toBe('/dashboard')
  })

  it('preserves the query string and fragment', () => {
    expect(safeRedirectPath('/search?q=test')).toBe('/search?q=test')
    expect(safeRedirectPath('/landlord/abc#reviews')).toBe('/landlord/abc#reviews')
  })
})
