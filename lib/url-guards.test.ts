import { describe, it, expect } from 'vitest'
import {
  isValidPropertyPath,
  isValidLandlordPath,
  isValidCityPath,
  US_STATE_CODES,
} from './url-guards'

describe('isValidPropertyPath', () => {
  it('accepts a v4-shaped UUID', () => {
    expect(isValidPropertyPath('/property/26d317bc-7c48-4d40-b339-45664a49ea8b')).toBe(true)
  })

  it('accepts trailing slash', () => {
    expect(isValidPropertyPath('/property/26d317bc-7c48-4d40-b339-45664a49ea8b/')).toBe(true)
  })

  it('rejects non-UUID slugs', () => {
    expect(isValidPropertyPath('/property/foo')).toBe(false)
    expect(isValidPropertyPath('/property/123')).toBe(false)
    expect(isValidPropertyPath('/property/')).toBe(false)
  })

  it('rejects partial UUIDs', () => {
    expect(isValidPropertyPath('/property/26d317bc-7c48-4d40-b339')).toBe(false)
  })

  it('rejects UUID with extra segments after', () => {
    expect(isValidPropertyPath('/property/26d317bc-7c48-4d40-b339-45664a49ea8b-extra')).toBe(false)
  })
})

describe('isValidLandlordPath', () => {
  it('accepts canonical {name}-{city}-{hash} slugs', () => {
    expect(isValidLandlordPath('/landlord/faithful-coo-inc-nyc-6153')).toBe(true)
    expect(isValidLandlordPath('/landlord/acme-properties-pittsburgh-abc1')).toBe(true)
  })

  it('accepts the shortest legal slug (8 chars)', () => {
    expect(isValidLandlordPath('/landlord/abcdefgh')).toBe(true)
  })

  it('rejects too-short slugs', () => {
    expect(isValidLandlordPath('/landlord/x')).toBe(false)
    expect(isValidLandlordPath('/landlord/abc1234')).toBe(false) // 7 chars
  })

  it('rejects slugs with leading/trailing hyphens', () => {
    expect(isValidLandlordPath('/landlord/-hello-world-abcd')).toBe(false)
    expect(isValidLandlordPath('/landlord/hello-world-abcd-')).toBe(false)
  })

  it('rejects slugs with bad chars', () => {
    expect(isValidLandlordPath('/landlord/hello world abcd')).toBe(false)
    expect(isValidLandlordPath("/landlord/cathy's-place-pgh-abc1")).toBe(false)
    expect(isValidLandlordPath('/landlord/hello@world-abcd')).toBe(false)
  })
})

describe('isValidCityPath', () => {
  it('accepts state + city', () => {
    expect(isValidCityPath('/city/ny/new-york')).toBe(true)
    expect(isValidCityPath('/city/pa/pittsburgh')).toBe(true)
    expect(isValidCityPath('/city/dc/washington')).toBe(true)
  })

  it('case-insensitive on state code', () => {
    expect(isValidCityPath('/city/NY/new-york')).toBe(true)
  })

  it('rejects unknown state codes', () => {
    expect(isValidCityPath('/city/zz/anywhere')).toBe(false)
    expect(isValidCityPath('/city/xx/anywhere')).toBe(false)
  })

  it('rejects non-2-letter state', () => {
    expect(isValidCityPath('/city/cal/anywhere')).toBe(false)
    expect(isValidCityPath('/city/c/anywhere')).toBe(false)
  })

  it('rejects malformed city slugs', () => {
    expect(isValidCityPath('/city/ny/')).toBe(false)
    expect(isValidCityPath('/city/ny/new york')).toBe(false) // space
    expect(isValidCityPath('/city/ny/Cathy@s-Place')).toBe(false)
  })
})

describe('US_STATE_CODES', () => {
  it('has 51 entries (50 states + DC)', () => {
    expect(US_STATE_CODES.size).toBe(51)
  })

  it('includes every state abbreviation', () => {
    for (const state of ['ny', 'ca', 'tx', 'fl', 'wy', 'dc', 'hi', 'ak']) {
      expect(US_STATE_CODES.has(state)).toBe(true)
    }
  })

  it('does NOT include territories or country codes', () => {
    for (const bad of ['pr', 'gu', 'us', 'ca', 'mx']) {
      // 'ca' is California not Canada — it's intentionally in the set.
      // Actually keep ca as expected; only check pr/gu/us/mx
      if (bad === 'ca') continue
      expect(US_STATE_CODES.has(bad)).toBe(false)
    }
  })
})
