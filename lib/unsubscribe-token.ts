import crypto from 'crypto'

// HMAC-signed unsubscribe tokens so every email footer can drop the user's
// email preferences without requiring a login. The signing key reuses
// CRON_SECRET (already set in Vercel) — if that env var isn't set, the
// helpers fail closed.

const TOKEN_TTL_DAYS = 365 // emails are archived for a long time; give links headroom

function signingKey(): string {
  const k = process.env.CRON_SECRET ?? process.env.UNSUBSCRIBE_SIGNING_KEY
  if (!k) throw new Error('CRON_SECRET or UNSUBSCRIBE_SIGNING_KEY must be set')
  return k
}

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64urlDecode(s: string): Buffer {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4))
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64')
}

export function createUnsubscribeToken(userId: string): string {
  const issuedAt = Math.floor(Date.now() / 1000)
  const payload = `${userId}.${issuedAt}`
  const sig = crypto.createHmac('sha256', signingKey()).update(payload).digest()
  return `${b64url(Buffer.from(payload))}.${b64url(sig)}`
}

export function verifyUnsubscribeToken(token: string): { userId: string } | null {
  const parts = token.split('.')
  if (parts.length !== 2) return null
  try {
    const payload = b64urlDecode(parts[0]!).toString('utf8')
    const sigGiven = b64urlDecode(parts[1]!)
    const sigExpected = crypto.createHmac('sha256', signingKey()).update(payload).digest()
    if (sigGiven.length !== sigExpected.length) return null
    if (!crypto.timingSafeEqual(sigGiven, sigExpected)) return null
    const [userId, issuedAt] = payload.split('.')
    if (!userId || !issuedAt) return null
    const age = Math.floor(Date.now() / 1000) - parseInt(issuedAt, 10)
    if (age > TOKEN_TTL_DAYS * 86400) return null
    return { userId }
  } catch {
    return null
  }
}
