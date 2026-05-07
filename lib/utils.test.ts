import { describe, it, expect } from 'vitest'
import {
  cn,
  formatAddress,
  formatReviewerName,
  slugify,
  titleCase,
  truncate,
  formatCount,
  severityLabel,
  severityColor,
  formatDate,
  formatDateRelative,
  formatRentalPeriod,
  detectFileType,
  pluralize,
} from './utils'

describe('cn', () => {
  it('joins multiple class strings', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('drops falsy entries (clsx behavior)', () => {
    expect(cn('foo', false, null, undefined, 'bar')).toBe('foo bar')
  })

  it('merges conflicting Tailwind classes (later wins via tailwind-merge)', () => {
    // The whole reason we use twMerge — so a callsite can override
    // a default like `p-4` with `p-2` without both ending up in the DOM.
    expect(cn('p-4', 'p-2')).toBe('p-2')
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
  })

  it('handles arrays of class values', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar')
    expect(cn('a', ['b', 'c'])).toBe('a b c')
  })

  it('handles conditional objects', () => {
    expect(cn('a', { b: true, c: false })).toBe('a b')
  })
})

describe('formatAddress', () => {
  it('joins line1 + city + state with commas', () => {
    expect(formatAddress('123 Main St', 'New York', 'NY')).toBe('123 Main St, New York, NY')
  })

  it('appends zip when present', () => {
    expect(formatAddress('123 Main St', 'New York', 'NY', '10001')).toBe('123 Main St, New York, NY 10001')
  })

  it('drops empty parts (e.g. missing line1)', () => {
    expect(formatAddress('', 'New York', 'NY')).toBe('New York, NY')
  })
})

describe('formatReviewerName', () => {
  it('returns "First L." for two-part names (privacy-first)', () => {
    expect(formatReviewerName('Jane Smith')).toBe('Jane S.')
    expect(formatReviewerName('Maria Garcia Lopez')).toBe('Maria L.') // last-initial only
  })

  it('returns the single name if there is only one part', () => {
    expect(formatReviewerName('Cher')).toBe('Cher')
  })

  it('falls back to email local part when no name', () => {
    expect(formatReviewerName(null, 'jane.doe@example.com')).toBe('jane.doe')
  })

  it('falls back to "Anonymous Renter" when neither is provided', () => {
    expect(formatReviewerName(null, null)).toBe('Anonymous Renter')
    expect(formatReviewerName(undefined, undefined)).toBe('Anonymous Renter')
  })

  it('treats whitespace-only name as no name', () => {
    expect(formatReviewerName('   ', 'foo@bar.com')).toBe('foo')
  })
})

describe('slugify', () => {
  it('lowercases + replaces spaces with hyphens', () => {
    expect(slugify('Hello World')).toBe('hello-world')
  })

  it('strips punctuation', () => {
    expect(slugify("Cathy's Properties LLC, Inc.")).toBe('cathys-properties-llc-inc')
  })

  it('collapses multiple hyphens and trims edges', () => {
    expect(slugify('  --hello-- ')).toBe('hello')
    expect(slugify('a   b   c')).toBe('a-b-c')
  })

  it('drops non-ascii chars', () => {
    expect(slugify('café-élan 5')).toBe('caf-lan-5')
  })
})

describe('titleCase', () => {
  it('capitalizes the first letter of each word', () => {
    expect(titleCase('FAITHFUL COO INC')).toBe('Faithful Coo Inc')
    expect(titleCase('123 main st')).toBe('123 Main St')
  })
})

describe('truncate', () => {
  it('returns the input untouched when under the limit', () => {
    expect(truncate('hello', 10)).toBe('hello')
  })

  it('cuts to maxLen and appends an ellipsis', () => {
    expect(truncate('hello world hello', 11)).toBe('hello world…')
  })

  it('trims trailing whitespace before the ellipsis', () => {
    expect(truncate('hello world           ', 8)).toBe('hello wo…')
  })
})

describe('formatCount', () => {
  it('returns small numbers as-is', () => {
    expect(formatCount(0)).toBe('0')
    expect(formatCount(42)).toBe('42')
    expect(formatCount(999)).toBe('999')
  })

  it('uses K suffix for thousands', () => {
    expect(formatCount(1000)).toBe('1.0K')
    expect(formatCount(2500)).toBe('2.5K')
    expect(formatCount(999_999)).toBe('1000.0K')
  })

  it('uses M suffix for millions', () => {
    expect(formatCount(1_000_000)).toBe('1.0M')
    expect(formatCount(2_500_000)).toBe('2.5M')
  })
})

describe('severityLabel', () => {
  it('returns "Closed" when isClosed flag is set, regardless of severity', () => {
    expect(severityLabel('critical', true)).toBe('Closed')
    expect(severityLabel(null, true)).toBe('Closed')
  })

  it('maps each severity level to its display label', () => {
    expect(severityLabel('critical')).toBe('Critical')
    expect(severityLabel('high')).toBe('Serious')
    expect(severityLabel('medium')).toBe('Minor')
    expect(severityLabel('low')).toBe('Informational')
  })

  it('returns "Unknown" for null / unrecognized', () => {
    expect(severityLabel(null)).toBe('Unknown')
  })
})

describe('formatDate', () => {
  it('formats an ISO date as "MMM d, yyyy"', () => {
    expect(formatDate('2026-04-15T00:00:00.000Z')).toMatch(/Apr (14|15), 2026/) // tz-tolerant
    expect(formatDate('2026-01-01')).toMatch(/Jan|Dec/)
  })

  it('returns "Unknown" for empty / null input', () => {
    expect(formatDate(null)).toBe('Unknown')
    expect(formatDate(undefined)).toBe('Unknown')
    expect(formatDate('')).toBe('Unknown')
  })
})

describe('severityColor', () => {
  it('returns class strings for every level + null fallback', () => {
    for (const sev of ['critical', 'high', 'medium', 'low'] as const) {
      const c = severityColor(sev)
      expect(c).toMatch(/text-/)
      expect(c.split(' ').length).toBeGreaterThanOrEqual(2)
    }
    // null should still produce something — not empty/undefined
    expect(severityColor(null).length).toBeGreaterThan(0)
  })

  it('critical is red, low is blue (semantic colors)', () => {
    expect(severityColor('critical')).toContain('red')
    expect(severityColor('low')).toContain('blue')
  })
})

describe('formatDateRelative', () => {
  it('returns empty string for null / undefined / empty input', () => {
    expect(formatDateRelative(null)).toBe('')
    expect(formatDateRelative(undefined)).toBe('')
    expect(formatDateRelative('')).toBe('')
  })

  it('renders a date in relative form with the "ago" suffix', () => {
    // We don't pin a specific phrase since date-fns renders bracketed
    // ranges (e.g. "about 1 hour ago" vs "1 minute ago") depending on
    // the gap. Just verify the output is non-empty and contains "ago"
    // for a past date — that's the contract callers rely on.
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const out = formatDateRelative(yesterday)
    expect(out).toMatch(/ago$/)
    expect(out.length).toBeGreaterThan(0)
  })

  it('renders future dates with "in" prefix', () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    const out = formatDateRelative(tomorrow)
    expect(out).toMatch(/^in /)
  })
})

describe('formatRentalPeriod', () => {
  it('formats start–end as "MMM yyyy – MMM yyyy"', () => {
    expect(formatRentalPeriod('2024-06-01', '2025-08-15')).toMatch(/^(May|Jun) 2024 – (Jul|Aug) 2025$/)
  })

  it('returns "Unknown period" when start is missing', () => {
    expect(formatRentalPeriod()).toBe('Unknown period')
    expect(formatRentalPeriod(null, '2025-01-01')).toBe('Unknown period')
  })

  it('shows "Present" for current tenants', () => {
    expect(formatRentalPeriod('2024-06-01', null, true)).toMatch(/^(May|Jun) 2024 – Present$/)
  })

  it('shows "Present" when end is missing even without isCurrent', () => {
    expect(formatRentalPeriod('2024-06-01')).toMatch(/^(May|Jun) 2024 – Present$/)
  })
})

describe('detectFileType', () => {
  // Helper: build a File with the given magic-byte prefix + a few junk bytes
  // so we exercise the slice(0, 4) read path realistically.
  function fileFrom(prefix: number[], padding: number = 8): File {
    const bytes = new Uint8Array([...prefix, ...Array(padding).fill(0x00)])
    return new File([bytes], 'check')
  }

  it('detects PDF (%PDF magic)', async () => {
    expect(await detectFileType(fileFrom([0x25, 0x50, 0x44, 0x46]))).toBe('application/pdf')
  })

  it('detects JPEG (FFD8FF magic)', async () => {
    expect(await detectFileType(fileFrom([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg')
    expect(await detectFileType(fileFrom([0xff, 0xd8, 0xff, 0xe1]))).toBe('image/jpeg')
  })

  it('detects PNG (\\x89PNG magic)', async () => {
    expect(await detectFileType(fileFrom([0x89, 0x50, 0x4e, 0x47]))).toBe('image/png')
  })

  it('detects DOCX (PK\\x03\\x04 ZIP magic — used for OOXML)', async () => {
    expect(await detectFileType(fileFrom([0x50, 0x4b, 0x03, 0x04]))).toBe(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    )
  })

  it('returns null for unknown magic bytes', async () => {
    // GIF89a — recognized format but not in our allowlist
    expect(await detectFileType(fileFrom([0x47, 0x49, 0x46, 0x38]))).toBeNull()
    // Plain text "abc" — no magic
    expect(await detectFileType(fileFrom([0x61, 0x62, 0x63, 0x64]))).toBeNull()
  })

  it('returns null for empty file', async () => {
    expect(await detectFileType(new File([new Uint8Array()], 'empty'))).toBeNull()
  })

  it('does not trust file extension — magic bytes win', async () => {
    // A renamed-to-pdf file whose contents are a JPEG should detect as JPEG.
    // The point of this helper is to prevent extension-spoofed uploads.
    const lying = new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00])], 'evil.pdf')
    expect(await detectFileType(lying)).toBe('image/jpeg')
  })
})

describe('pluralize', () => {
  it('uses singular for 1', () => {
    expect(pluralize(1, 'review')).toBe('1 review')
    expect(pluralize(1, 'item', 'things')).toBe('1 item')
  })

  it('appends "s" by default for non-1 counts', () => {
    expect(pluralize(0, 'review')).toBe('0 reviews')
    expect(pluralize(2, 'review')).toBe('2 reviews')
  })

  it('uses the provided plural form when given (irregular plurals)', () => {
    expect(pluralize(0, 'property', 'properties')).toBe('0 properties')
    expect(pluralize(2, 'property', 'properties')).toBe('2 properties')
    expect(pluralize(1, 'property', 'properties')).toBe('1 property')
  })
})
