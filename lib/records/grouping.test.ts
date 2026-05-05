import { describe, it, expect } from 'vitest'
import {
  categoryForRecordType,
  recordIsOpen,
  daysUntil,
  recordGroupSortIndex,
  RECORD_GROUP_ORDER,
} from './grouping'

describe('categoryForRecordType', () => {
  it('classifies informational types', () => {
    expect(categoryForRecordType('business_registration')).toBe('info')
  })

  it('classifies court types as eviction', () => {
    expect(categoryForRecordType('eviction')).toBe('eviction')
    expect(categoryForRecordType('eviction_filing')).toBe('eviction')
    expect(categoryForRecordType('lsc_eviction')).toBe('eviction')
    expect(categoryForRecordType('court_listener')).toBe('eviction')
  })

  it('classifies complaint-flavored types as complaint', () => {
    expect(categoryForRecordType('dob_complaint')).toBe('complaint')
    expect(categoryForRecordType('austin_complaint')).toBe('complaint')
    expect(categoryForRecordType('311_complaint')).toBe('complaint')
    expect(categoryForRecordType('nyc_311')).toBe('complaint')
  })

  it('defaults everything else to violation', () => {
    expect(categoryForRecordType('hpd_violation')).toBe('violation')
    expect(categoryForRecordType('seattle_violation')).toBe('violation')
    expect(categoryForRecordType('mystery_type')).toBe('violation')
  })
})

describe('recordIsOpen', () => {
  it('returns false for informational types regardless of status', () => {
    expect(recordIsOpen({ record_type: 'business_registration', status: 'active' })).toBe(false)
  })

  it('uses extractor isOpen when present (source-specific signal)', () => {
    expect(recordIsOpen({ record_type: 'hpd_violation', status: 'OPEN' }, { isOpen: false })).toBe(false)
    expect(recordIsOpen({ record_type: 'hpd_violation', status: 'closed' }, { isOpen: true })).toBe(true)
  })

  it('falls back to status string heuristics', () => {
    expect(recordIsOpen({ record_type: 'hpd_violation', status: 'NOV SENT OUT' })).toBe(true)
    expect(recordIsOpen({ record_type: 'hpd_violation', status: 'closed' })).toBe(false)
    expect(recordIsOpen({ record_type: 'hpd_violation', status: 'CLOSED' })).toBe(false)
    expect(recordIsOpen({ record_type: 'hpd_violation', status: 'dismissed' })).toBe(false)
  })

  it('treats null status as open (no negative signal)', () => {
    expect(recordIsOpen({ record_type: 'hpd_violation', status: null })).toBe(true)
  })
})

describe('daysUntil', () => {
  it('returns null on null/undefined/empty', () => {
    expect(daysUntil(null)).toBeNull()
    expect(daysUntil(undefined)).toBeNull()
    expect(daysUntil('')).toBeNull()
  })

  it('returns null on unparseable dates', () => {
    expect(daysUntil('not-a-date')).toBeNull()
  })

  it('positive when in the future, negative when past', () => {
    const today = new Date('2026-05-05').getTime()
    expect(daysUntil('2026-05-15', today)).toBe(10)
    expect(daysUntil('2026-04-15', today)).toBe(-20)
    expect(daysUntil('2026-05-05', today)).toBe(0)
  })
})

describe('recordGroupSortIndex', () => {
  it('returns the position in RECORD_GROUP_ORDER', () => {
    expect(recordGroupSortIndex('eviction')).toBe(0)
    expect(recordGroupSortIndex('hpd_violation')).toBe(RECORD_GROUP_ORDER.indexOf('hpd_violation'))
  })

  it('returns 99 (sort to end) for unknown types', () => {
    expect(recordGroupSortIndex('totally_made_up')).toBe(99)
  })

  it('orders evictions before violations before complaints before info', () => {
    expect(recordGroupSortIndex('eviction')).toBeLessThan(recordGroupSortIndex('hpd_violation'))
    expect(recordGroupSortIndex('hpd_violation')).toBeLessThan(recordGroupSortIndex('311_complaint'))
    expect(recordGroupSortIndex('311_complaint')).toBeLessThan(recordGroupSortIndex('business_registration'))
  })
})
