import { describe, it, expect } from 'vitest'
import {
  formatAddress,
  formatReviewerName,
  slugify,
  titleCase,
  truncate,
  formatCount,
  ratingToLabel,
  severityLabel,
  gradeColor,
  gradeBgLight,
} from './utils'

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
