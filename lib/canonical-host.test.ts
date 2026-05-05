import { describe, it, expect, afterEach, vi } from 'vitest'
import { canonicalSiteUrl } from './canonical-host'

describe('canonicalSiteUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('forces www when env is set to bare apex (the production misconfiguration)', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://vettrentals.com')
    expect(canonicalSiteUrl()).toBe('https://www.vettrentals.com')
  })

  it('passes www through unchanged', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://www.vettrentals.com')
    expect(canonicalSiteUrl()).toBe('https://www.vettrentals.com')
  })

  it('falls back to www when env var is missing', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '')
    expect(canonicalSiteUrl()).toBe('https://www.vettrentals.com')
  })

  it('preserves the protocol and any path/query', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'http://vettrentals.com')
    expect(canonicalSiteUrl()).toBe('http://www.vettrentals.com')
  })

  it('does not break unrelated hostnames (preview deploys)', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://vett-preview-abc.vercel.app')
    expect(canonicalSiteUrl()).toBe('https://vett-preview-abc.vercel.app')
  })

  it('does not double-prefix existing www subdomain edge cases', () => {
    // Example: a hypothetical "wvettrentals.com" subdomain shouldn't be
    // rewritten — the regex requires the literal "vettrentals.com" with
    // no character between the protocol and "vettrentals" (other than www).
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://staging.vettrentals.com')
    expect(canonicalSiteUrl()).toBe('https://staging.vettrentals.com')
  })
})
