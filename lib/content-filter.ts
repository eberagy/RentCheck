// Conservative content-safety filter. Triggers auto-flagging on review
// submission so admins see it before it hits the public feed. Not a substitute
// for human moderation — this is the "obviously hostile" tripwire.
//
// Philosophy: cast a narrow net. False positives frustrate users and teach
// them to work around us. We flag only:
//   1. Slurs commonly used as identity-based hate (a small curated list).
//   2. Threats with explicit intent.
//   3. Attempts to dox (phone numbers + "lives at" patterns, SSN-like strings).
//
// Everything else — insults, strong language, anger at a landlord — is human
// and belongs on the platform. Admin can still remove via the normal queue.

// Identity-based slurs. Curated; avoid linguistic-variation arms race — the
// bypasser tax isn't worth it. Intentionally short; expand only if abuse
// actually starts accruing.
const SLUR_TERMS = [
  '\\bn[i1]gg[e3]r\\b',
  '\\bn[i1]gg[a4]\\b',
  '\\bf[a@]gg[o0]t\\b',
  '\\bk[i1]k[e3]\\b',
  '\\bch[i1]nk\\b',
  '\\bsp[i1]c\\b',
  '\\btr[a@]nny\\b',
  '\\bret[a@]rd\\b',
  '\\bdyk[e3]\\b',
] as const

// Patterns that read like personal-info doxxing attempts.
const DOX_PATTERNS = [
  /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/, // SSN-ish
  /\blives?\s+at\s+\d/i,               // "lives at 123..."
  /\bhome\s+address\s*[:\-]/i,         // "home address:"
] as const

// Threats with explicit intent. Loose but deliberately specific — "I'll sue"
// isn't a threat; "I'll kill you" is.
const THREAT_PATTERNS = [
  /\b(i'?ll|i\s+am\s+going\s+to|gonna)\s+(kill|shoot|stab|burn|beat)\s+(you|him|her|them|\w+)/i,
  /\b(kill|murder|shoot)\s+yourself\b/i,
] as const

const SLUR_REGEX = new RegExp(SLUR_TERMS.join('|'), 'i')

export interface ContentFlagResult {
  flagged: boolean
  reason?: 'slur' | 'doxxing' | 'threat'
  matched?: string
}

export function shouldAutoFlag(text: string | null | undefined): ContentFlagResult {
  if (!text) return { flagged: false }
  const normalized = text.toLowerCase()

  if (SLUR_REGEX.test(normalized)) {
    return { flagged: true, reason: 'slur' }
  }
  for (const pattern of DOX_PATTERNS) {
    if (pattern.test(normalized)) {
      return { flagged: true, reason: 'doxxing', matched: pattern.source }
    }
  }
  for (const pattern of THREAT_PATTERNS) {
    if (pattern.test(normalized)) {
      return { flagged: true, reason: 'threat', matched: pattern.source }
    }
  }

  return { flagged: false }
}

// Combine title + body into a single check.
export function checkReviewContent(args: { title: string; body: string }): ContentFlagResult {
  const titleCheck = shouldAutoFlag(args.title)
  if (titleCheck.flagged) return titleCheck
  return shouldAutoFlag(args.body)
}
