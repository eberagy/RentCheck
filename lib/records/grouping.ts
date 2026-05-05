// Pure helpers for the records panel — categorization, open/closed
// status, days-until math, and group sort order. Pulled out of
// components/landlord/PublicRecordsPanel.tsx so the logic can be
// unit-tested without rendering the panel.

import type { PublicRecord } from '@/types'
import type { RecordDetails } from './extract'

export const RECORD_GROUP_ORDER = [
  'eviction', 'eviction_filing', 'lsc_eviction', 'sf_eviction',
  'court_case', 'court_listener',
  'hpd_violation', 'dob_violation', 'dob_complaint',
  'boston_violation', 'philly_violation', 'chicago_violation',
  'pittsburgh_violation', 'baltimore_vacant_notice',
  'austin_complaint', 'seattle_violation', 'la_violation',
  '311_complaint', 'code_enforcement', 'nyc_311',
  'business_registration',
] as const

export const INFORMATIONAL_RECORD_TYPES = new Set(['business_registration'])

export const COURT_RECORD_TYPES = new Set([
  'eviction', 'eviction_filing', 'lsc_eviction', 'sf_eviction',
  'court_case', 'court_listener',
])

export type RecordCategory = 'eviction' | 'violation' | 'complaint' | 'info'

/** Coarse category used for header colors / icons in the records panel. */
export function categoryForRecordType(type: string): RecordCategory {
  if (INFORMATIONAL_RECORD_TYPES.has(type)) return 'info'
  if (COURT_RECORD_TYPES.has(type)) return 'eviction'
  if (type.includes('complaint') || type === 'nyc_311' || type === '311_complaint') return 'complaint'
  return 'violation'
}

/** Whether a record is currently open. Source-specific isOpen takes
 *  priority (extractor sets it for NYC HPD, Chicago, etc.); falls back
 *  to status-string heuristics. Informational types are always closed. */
export function recordIsOpen(record: Pick<PublicRecord, 'record_type' | 'status'>, details?: Pick<RecordDetails, 'isOpen'>): boolean {
  if (INFORMATIONAL_RECORD_TYPES.has(record.record_type)) return false
  if (typeof details?.isOpen === 'boolean') return details.isOpen
  const status = record.status?.toLowerCase()
  return status !== 'closed' && status !== 'dismissed'
}

/** Days from now until `dateStr`. Negative when overdue, null when unparseable. */
export function daysUntil(dateStr: string | null | undefined, now = Date.now()): number | null {
  if (!dateStr) return null
  const t = new Date(dateStr).getTime()
  if (Number.isNaN(t)) return null
  return Math.round((t - now) / 86_400_000)
}

/** Stable sort index for a record_type using RECORD_GROUP_ORDER. Unknown
 *  types sort to the end. */
export function recordGroupSortIndex(type: string): number {
  const i = RECORD_GROUP_ORDER.indexOf(type as typeof RECORD_GROUP_ORDER[number])
  return i === -1 ? 99 : i
}
