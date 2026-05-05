import { describe, it, expect } from 'vitest'
import { SOURCE_LABELS, RECORD_TYPE_LABELS } from '@/types'

describe('SOURCE_LABELS', () => {
  it('every source string has a label', () => {
    // Every source key the records panel knows about should map to
    // a human-readable label. If a new sync route adds a source
    // identifier without registering a label here, DataAccuracyNote
    // shows the raw identifier (e.g. "Source: nyc_hpd") instead of
    // "Source: NYC HPD".
    const knownSources = [
      'nyc_hpd', 'nyc_dob', 'nyc_marshals', 'nyc_311',
      'chicago_buildings', 'sf_housing', 'boston_isd',
      'philadelphia', 'austin_code', 'seattle_sdci',
      'pittsburgh_pli', 'baltimore_vacants',
      'dallas_code', 'kansas_city_code',
    ]
    for (const source of knownSources) {
      expect(SOURCE_LABELS[source]).toBeDefined()
      expect(SOURCE_LABELS[source]!.length).toBeGreaterThan(0)
    }
  })

  it('labels are short enough to render on chips', () => {
    for (const [, label] of Object.entries(SOURCE_LABELS)) {
      expect(label.length).toBeLessThanOrEqual(40)
    }
  })

  it('labels are all string (no accidental nullish entries)', () => {
    for (const [, label] of Object.entries(SOURCE_LABELS)) {
      expect(typeof label).toBe('string')
    }
  })
})

describe('RECORD_TYPE_LABELS', () => {
  it('covers every record_type used by the panel', () => {
    // RECORD_TYPE_LABELS keys the group-header pills on the records
    // panel. Missing entries fall back to the raw record_type string,
    // which reads like "hpd_violation" instead of "HPD Violation".
    const groupTypes = [
      'eviction', 'eviction_filing', 'lsc_eviction', 'sf_eviction',
      'court_case', 'court_listener',
      'hpd_violation', 'dob_violation', 'dob_complaint',
      'boston_violation', 'philly_violation', 'chicago_violation',
      'pittsburgh_violation', 'baltimore_vacant_notice',
      'austin_complaint', 'seattle_violation', 'la_violation',
      '311_complaint', 'nyc_311',
      'business_registration', 'code_enforcement',
    ]
    const missing: string[] = []
    for (const t of groupTypes) {
      if (!(t in RECORD_TYPE_LABELS)) missing.push(t)
    }
    expect(missing).toEqual([])
  })
})
