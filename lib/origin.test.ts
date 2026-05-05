import { describe, it, expect } from 'vitest'
import type { NextRequest } from 'next/server'
import { assertSameOrigin } from './origin'

function makeReq(headers: Record<string, string>): NextRequest {
  // The function only reads .headers.get(...), so a minimal duck-type
  // shape is enough for the test surface area.
  return {
    headers: { get: (k: string) => headers[k.toLowerCase()] ?? null },
  } as unknown as NextRequest
}

describe('assertSameOrigin', () => {
  it('passes through (returns null) for the production origin', async () => {
    expect(assertSameOrigin(makeReq({ origin: 'https://www.vettrentals.com' }))).toBeNull()
    expect(assertSameOrigin(makeReq({ origin: 'https://vettrentals.com' }))).toBeNull()
  })

  it('passes through localhost dev origins', async () => {
    expect(assertSameOrigin(makeReq({ origin: 'http://localhost:3000' }))).toBeNull()
    expect(assertSameOrigin(makeReq({ origin: 'http://127.0.0.1:3000' }))).toBeNull()
  })

  it('passes through Vercel preview deployments via *.vercel.app suffix', async () => {
    expect(assertSameOrigin(makeReq({ origin: 'https://vett-preview-abc123.vercel.app' }))).toBeNull()
  })

  it('falls back to Referer when Origin is absent', async () => {
    expect(assertSameOrigin(makeReq({
      referer: 'https://www.vettrentals.com/some/page',
    }))).toBeNull()
  })

  it('rejects with 403 when neither Origin nor Referer is present', async () => {
    const res = assertSameOrigin(makeReq({}))
    expect(res?.status).toBe(403)
    const body = await res?.json()
    expect(body.error).toMatch(/Missing Origin/)
  })

  it('rejects evil.com', async () => {
    const res = assertSameOrigin(makeReq({ origin: 'https://evil.com' }))
    expect(res?.status).toBe(403)
    const body = await res?.json()
    expect(body.error).toMatch(/Cross-origin/)
  })

  it('rejects an attempt to spoof via .vercel.app at the front', async () => {
    // The suffix check uses URL.hostname.endsWith('.vercel.app'), so
    // "vercel.app.evil.com" does NOT end in ".vercel.app" — should reject.
    const res = assertSameOrigin(makeReq({ origin: 'https://vercel.app.evil.com' }))
    expect(res?.status).toBe(403)
  })

  it('rejects when origin is not a URL', async () => {
    expect(assertSameOrigin(makeReq({ origin: 'not-a-url' }))?.status).toBe(403)
  })
})
