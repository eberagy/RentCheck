import { describe, it, expect } from 'vitest'
import { getCityAliases, getCanonicalCity, citySlug, cityPagePath } from './cities'

describe('getCityAliases', () => {
  it('resolves the NYC metro from its borough names', () => {
    expect(getCityAliases('Manhattan')).toContain('Brooklyn')
    expect(getCityAliases('manhattan')).toContain('Brooklyn') // case insensitive
    expect(getCityAliases('NYC')).toContain('Queens')
    expect(getCityAliases('Staten Island')).toContain('Bronx')
  })

  it('resolves the canonical name back to the metro', () => {
    expect(getCityAliases('New York')).toContain('Manhattan')
  })

  it('returns null for unknown cities', () => {
    expect(getCityAliases('Mars')).toBeNull()
    expect(getCityAliases('')).toBeNull()
  })
})

describe('getCanonicalCity', () => {
  it('maps borough names to the metro display name', () => {
    expect(getCanonicalCity('Manhattan')).toBe('New York')
    expect(getCanonicalCity('Brooklyn')).toBe('New York')
    expect(getCanonicalCity('Queens')).toBe('New York')
    expect(getCanonicalCity('The Bronx')).toBe('New York')
  })

  it('passes through cities not in any metro', () => {
    expect(getCanonicalCity('Pittsburgh')).toBe('Pittsburgh')
    expect(getCanonicalCity('Houston')).toBe('Houston')
  })

  it('is case insensitive on the lookup', () => {
    expect(getCanonicalCity('MANHATTAN')).toBe('New York')
    expect(getCanonicalCity('brooklyn')).toBe('New York')
  })
})

describe('citySlug', () => {
  it('lowercases + replaces spaces with hyphens', () => {
    expect(citySlug('New York')).toBe('new-york')
    expect(citySlug('San Francisco')).toBe('san-francisco')
    expect(citySlug('Pittsburgh')).toBe('pittsburgh')
  })

  it('collapses multiple spaces', () => {
    expect(citySlug('New   York')).toBe('new-york')
  })
})

describe('cityPagePath', () => {
  it('routes boroughs to the canonical NYC page', () => {
    expect(cityPagePath('Manhattan', 'NY')).toBe('/city/ny/new-york')
    expect(cityPagePath('Brooklyn', 'NY')).toBe('/city/ny/new-york')
    expect(cityPagePath('Staten Island', 'NY')).toBe('/city/ny/new-york')
  })

  it('builds a normal path for non-metro cities', () => {
    expect(cityPagePath('Pittsburgh', 'PA')).toBe('/city/pa/pittsburgh')
    expect(cityPagePath('Houston', 'TX')).toBe('/city/tx/houston')
  })

  it('lowercases the state abbr', () => {
    expect(cityPagePath('Pittsburgh', 'PA')).toBe('/city/pa/pittsburgh')
    expect(cityPagePath('Pittsburgh', 'pa')).toBe('/city/pa/pittsburgh')
  })
})
