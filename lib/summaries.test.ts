import { describe, it, expect } from 'vitest'
import { buildLandlordSummary, buildPropertySummary, truncateSummary } from './summaries'

const LANDLORD_BASE = {
  display_name: 'Acme Properties',
  avg_rating: 0,
  review_count: 0,
  open_violation_count: 0,
  total_violation_count: 0,
  eviction_count: 0,
  city: 'Pittsburgh',
  state_abbr: 'PA',
  is_verified: false,
}

describe('buildLandlordSummary', () => {
  it('says no reviews yet when review_count is 0', () => {
    const s = buildLandlordSummary({ landlord: LANDLORD_BASE })
    expect(s).toMatch(/No lease-verified renter reviews are published for Acme Properties yet/)
  })

  it('formats reviews + rating when present', () => {
    const s = buildLandlordSummary({
      landlord: { ...LANDLORD_BASE, review_count: 5, avg_rating: 4.235 },
    })
    expect(s).toMatch(/5 lease-verified reviews with a 4.2 average rating/)
  })

  it('singular/plural review correctly', () => {
    const s = buildLandlordSummary({
      landlord: { ...LANDLORD_BASE, review_count: 1, avg_rating: 5 },
    })
    expect(s).toMatch(/1 lease-verified review with/)
  })

  it('mentions open violations over total when both present', () => {
    const s = buildLandlordSummary({
      landlord: { ...LANDLORD_BASE, open_violation_count: 3, total_violation_count: 10 },
    })
    expect(s).toContain('3 open public records currently linked')
    expect(s).not.toContain('10 public records')
  })

  it('falls back to total when no open violations', () => {
    const s = buildLandlordSummary({
      landlord: { ...LANDLORD_BASE, total_violation_count: 7 },
    })
    expect(s).toContain('7 public records on file, none currently open')
  })

  it('mentions evictions and properties and verification', () => {
    const s = buildLandlordSummary({
      landlord: { ...LANDLORD_BASE, eviction_count: 2, is_verified: true, review_count: 1, avg_rating: 4 },
      propertyCount: 12,
    })
    expect(s).toContain('2 eviction filings on record')
    expect(s).toContain('12 linked properties')
    expect(s).toContain('landlord identity verified by Vett')
  })

  it('always ends in a period', () => {
    expect(buildLandlordSummary({ landlord: LANDLORD_BASE }).endsWith('.')).toBe(true)
  })
})

describe('buildPropertySummary', () => {
  const PROP_BASE = {
    address_line1: '123 Forbes Ave',
    avg_rating: 0,
    review_count: 0,
    city: 'Pittsburgh',
    state_abbr: 'PA',
  }

  it('says no reviews yet when review_count is 0', () => {
    const s = buildPropertySummary({ property: PROP_BASE, records: [] })
    expect(s).toMatch(/No lease-verified renter reviews are published for 123 Forbes Ave yet/)
  })

  it('attaches a landlord name when given', () => {
    const s = buildPropertySummary({
      property: PROP_BASE,
      landlordName: 'Acme',
      records: [],
    })
    expect(s).toContain('linked to Acme')
  })

  it('reports open records and surfaces the latest filing', () => {
    const s = buildPropertySummary({
      property: PROP_BASE,
      records: [
        { title: 'OLD VIOLATION', status: 'open', filed_date: '2024-01-01' },
        { title: 'NEWER VIOLATION', status: 'open', filed_date: '2026-04-15' },
      ],
    })
    expect(s).toContain('2 open public records currently linked')
    expect(s).toContain('latest filing: newer violation')
  })

  it('falls back to "historical" wording when no open records', () => {
    const s = buildPropertySummary({
      property: PROP_BASE,
      records: [
        { title: 'X', status: 'closed', filed_date: '2020-01-01' },
        { title: 'Y', status: 'dismissed', filed_date: '2019-01-01' },
      ],
    })
    expect(s).toContain('2 historical public records on file')
  })
})

describe('truncateSummary', () => {
  it('returns input as-is when under maxLength', () => {
    expect(truncateSummary('short text', 50)).toBe('short text')
  })

  it('truncates to maxLength-1 chars + ellipsis when over', () => {
    expect(truncateSummary('hello world hello world hello', 12)).toBe('hello world…')
  })

  it('trims trailing whitespace before the ellipsis', () => {
    expect(truncateSummary('hello world           hello', 14)).toBe('hello world…')
  })

  it('default maxLength is 180', () => {
    const long = 'a'.repeat(200)
    expect(truncateSummary(long).length).toBe(180)
  })
})
