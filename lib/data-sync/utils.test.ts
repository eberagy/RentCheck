import { describe, it, expect } from 'vitest'
import { normalizeAddress } from './utils'

describe('normalizeAddress', () => {
  it('lowercases the input', () => {
    expect(normalizeAddress('100 MAIN ST')).toBe('100 main st')
  })

  it('expands long-form street suffixes', () => {
    expect(normalizeAddress('100 Main Street')).toBe('100 main st')
    expect(normalizeAddress('100 Madison Avenue')).toBe('100 madison ave')
    expect(normalizeAddress('100 Lake Boulevard')).toBe('100 lake blvd')
    expect(normalizeAddress('100 Oak Drive')).toBe('100 oak dr')
    expect(normalizeAddress('100 Ridge Road')).toBe('100 ridge rd')
    expect(normalizeAddress('100 Birch Lane')).toBe('100 birch ln')
    expect(normalizeAddress('100 Park Court')).toBe('100 park ct')
    expect(normalizeAddress('100 Sterling Place')).toBe('100 sterling pl')
  })

  it('only expands whole-word suffixes', () => {
    // "streetlight" should NOT become "stlight"
    expect(normalizeAddress('Streetlight Lane')).toBe('streetlight ln')
  })

  it('collapses runs of whitespace', () => {
    expect(normalizeAddress('  1392   Sterling   Place  ')).toBe('1392 sterling pl')
  })

  it('strips dots, commas, and pound signs', () => {
    expect(normalizeAddress('100 Main St., Apt #5')).toBe('100 main st apt 5')
  })

  it('returns trimmed result with no surrounding whitespace', () => {
    expect(normalizeAddress('   100 main st   ')).toBe('100 main st')
  })

  it('matches the Postgres mirror function (used in migration 113)', () => {
    // These cases were tested in production to ensure the JS and SQL
    // implementations stay in lockstep. If this test breaks, also fix
    // supabase/migrations/113_address_normalize_function.sql.
    expect(normalizeAddress('1234 Main Street')).toBe('1234 main st')
    expect(normalizeAddress('apt #5, 1500 Adam C Powell Boulevard.')).toBe('apt 5 1500 adam c powell blvd')
  })

  it('handles empty string input', () => {
    expect(normalizeAddress('')).toBe('')
  })
})
