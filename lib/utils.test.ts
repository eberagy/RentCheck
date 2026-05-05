import { describe, it, expect } from 'vitest'
import {
  cn,
  formatAddress,
  formatReviewerName,
  slugify,
  titleCase,
  truncate,
  formatCount,
  ratingToLabel,
  ratingToColor,
  severityLabel,
  severityColor,
  gradeColor,
  gradeBgLight,
  formatDate,
  formatRentalPeriod,
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

describe('ratingToLabel', () => {
  it('matches the cutoff bands', () => {
    expect(ratingToLabel(5.0)).toBe('Excellent')
    expect(ratingToLabel(4.5)).toBe('Excellent')
    expect(ratingToLabel(4.4)).toBe('Good')
    expect(ratingToLabel(3.5)).toBe('Good')
    expect(ratingToLabel(3.4)).toBe('Fair')
    expect(ratingToLabel(2.5)).toBe('Fair')
    expect(ratingToLabel(2.4)).toBe('Poor')
    expect(ratingToLabel(1.5)).toBe('Poor')
    expect(ratingToLabel(1.4)).toBe('Very Poor')
    expect(ratingToLabel(0)).toBe('Very Poor')
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

describe('gradeColor / gradeBgLight', () => {
  it('returns a class string for every grade letter A-F', () => {
    for (const letter of ['A', 'B', 'C', 'D', 'F'] as const) {
      const c = gradeColor(letter)
      expect(c).toMatch(/text-white/)
      expect(c.split(' ').length).toBeGreaterThanOrEqual(2)

      const lt = gradeBgLight(letter)
      expect(lt).toMatch(/border-/)
      expect(lt).toMatch(/text-/)
    }
  })

  it('returns a sane fallback for null grade (no styling guess)', () => {
    expect(gradeColor(null)).toBe('bg-slate-200 text-slate-600')
    expect(gradeBgLight(null)).toBe('bg-slate-50 border-slate-200 text-slate-600')
  })

  it('A grade is teal (positive), F is red (negative)', () => {
    expect(gradeColor('A')).toContain('teal')
    expect(gradeColor('F')).toContain('red')
    expect(gradeBgLight('A')).toContain('teal')
    expect(gradeBgLight('F')).toContain('red')
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

describe('ratingToColor', () => {
  it('teal for 4+, amber for 3+, orange for 2+, red below', () => {
    expect(ratingToColor(5)).toMatch(/teal/)
    expect(ratingToColor(4)).toMatch(/teal/)
    expect(ratingToColor(3.9)).toMatch(/amber/)
    expect(ratingToColor(3)).toMatch(/amber/)
    expect(ratingToColor(2.9)).toMatch(/orange/)
    expect(ratingToColor(2)).toMatch(/orange/)
    expect(ratingToColor(1.9)).toMatch(/red/)
    expect(ratingToColor(0)).toMatch(/red/)
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
