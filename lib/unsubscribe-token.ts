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

// Internal payload separator. Email addresses contain `.` so the prior
// dot-as-separator collided with email payloads; `:` is invalid in both
// email local-part and domain-part (RFC 5321), and not used in our
// UUIDs or numeric timestamps either, so it's safe here.
const SEP = ':'

export function createUnsubscribeToken(userId: string): string {
  const issuedAt = Math.floor(Date.now() / 1000)
  // 'u' tag distinguishes this from the email-based variant below.
  const payload = ['u', userId, String(issuedAt)].join(SEP)
  const sig = crypto.createHmac('sha256', signingKey()).update(payload).digest()
  return `${b64url(Buffer.from(payload))}.${b64url(sig)}`
}

/**
 * Email-based unsubscribe token for city alert / email_leads recipients
 * who don't have an account. Lets them honor a CAN-SPAM-compliant
 * one-click opt-out without ever signing in.
 */
export function createEmailUnsubscribeToken(email: string): string {
  const issuedAt = Math.floor(Date.now() / 1000)
  // Lowercase the email up front so a case-mismatch between original
  // capture and unsubscribe click doesn't fail-closed.
  const payload = ['e', email.toLowerCase(), String(issuedAt)].join(SEP)
  const sig = crypto.createHmac('sha256', signingKey()).update(payload).digest()
  return `${b64url(Buffer.from(payload))}.${b64url(sig)}`
}

type VerifiedToken = { kind: 'user'; userId: string } | { kind: 'email'; email: string }

export function verifyUnsubscribeToken(token: string): VerifiedToken | null {
  const parts = token.split('.')
  if (parts.length !== 2) return null
  try {
    const payload = b64urlDecode(parts[0]!).toString('utf8')
    const sigGiven = b64urlDecode(parts[1]!)
    const sigExpected = crypto.createHmac('sha256', signingKey()).update(payload).digest()
    if (sigGiven.length !== sigExpected.length) return null
    if (!crypto.timingSafeEqual(sigGiven, sigExpected)) return null
    // Tagged shapes: "u:<userId>:<ts>" or "e:<email>:<ts>". Legacy
    // unprefixed shape "<userId>.<ts>" is still accepted so emails
    // sent before the format change don't break (one-year TTL).
    if (payload.includes(SEP)) {
      const segments = payload.split(SEP)
      if (segments.length === 3 && segments[0] === 'u') {
        const [, userId, issuedAt] = segments
        if (!userId || !issuedAt) return null
        const age = Math.floor(Date.now() / 1000) - parseInt(issuedAt, 10)
        if (age > TOKEN_TTL_DAYS * 86400) return null
        return { kind: 'user', userId }
      }
      if (segments.length === 3 && segments[0] === 'e') {
        const [, email, issuedAt] = segments
        if (!email || !issuedAt) return null
        const age = Math.floor(Date.now() / 1000) - parseInt(issuedAt, 10)
        if (age > TOKEN_TTL_DAYS * 86400) return null
        return { kind: 'email', email: email.toLowerCase() }
      }
      return null
    }
    // Legacy: pre-format-change userId tokens used "<userId>.<ts>".
    const segments = payload.split('.')
    if (segments.length === 2) {
      const [userId, issuedAt] = segments
      if (!userId || !issuedAt) return null
      const age = Math.floor(Date.now() / 1000) - parseInt(issuedAt, 10)
      if (age > TOKEN_TTL_DAYS * 86400) return null
      return { kind: 'user', userId }
    }
    return null
  } catch {
    return null
  }
}
