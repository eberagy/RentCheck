'use client'

import { useState } from 'react'
import { AlertTriangle, ChevronDown, ChevronUp, ExternalLink, Info } from 'lucide-react'
import { ViolationBadge } from './ViolationBadge'
import { FCRADisclaimer } from '@/components/compliance/FCRADisclaimer'
import { DataAccuracyNote } from '@/components/compliance/DataAccuracyNote'
import { formatDate } from '@/lib/utils'
import { RECORD_TYPE_LABELS } from '@/types'
import type { PublicRecord } from '@/types'

interface PublicRecordsPanelProps {
  records: PublicRecord[]
  landlordName: string
  isUnclaimed?: boolean
  propertyAddress?: string
}

const GROUP_ORDER = [
  'eviction_filing', 'lsc_eviction', 'sf_eviction',
  'court_case', 'court_listener',
  'hpd_violation', 'dob_violation', 'boston_violation', 'philly_violation',
  'chicago_violation', 'austin_complaint', 'seattle_violation', 'la_violation',
  '311_complaint', 'code_enforcement',
]

function groupByType(records: PublicRecord[]) {
  const grouped: Record<string, PublicRecord[]> = {}
  for (const r of records) {
    if (!grouped[r.record_type]) grouped[r.record_type] = []
    grouped[r.record_type]!.push(r)
  }
  return Object.entries(grouped).sort(([a], [b]) => {
    const ia = GROUP_ORDER.indexOf(a), ib = GROUP_ORDER.indexOf(b)
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
  })
}

function RecordRow({ record }: { record: PublicRecord }) {
  const [expanded, setExpanded] = useState(false)
  const isClosed = record.status?.toLowerCase() === 'closed' || record.status?.toLowerCase() === 'dismissed'

  return (
    <div className={`border rounded-lg p-3 ${isClosed ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <ViolationBadge
              severity={record.severity}
              status={record.status}
              violationClass={record.violation_class}
              size="sm"
            />
            {record.case_number && (
              <span className="text-xs text-gray-500 font-mono">#{record.case_number}</span>
            )}
          </div>
          <p className="text-sm text-gray-900 mt-1 font-medium leading-snug">{record.title}</p>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
            {record.filed_date && <span>Filed: {formatDate(record.filed_date)}</span>}
            {record.closed_date && <span>Closed: {formatDate(record.closed_date)}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {record.source_url && (
            <a
              href={record.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              title="View original record"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          {record.description && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>
      </div>

      {expanded && record.description && (
        <p className="mt-2 text-sm text-gray-600 leading-relaxed border-t pt-2">{record.description}</p>
      )}

      <DataAccuracyNote source={record.source} lastSynced={record.last_synced_at} recordId={record.id} />
    </div>
  )
}

export function PublicRecordsPanel({ records, landlordName, isUnclaimed, propertyAddress }: PublicRecordsPanelProps) {
  const grouped = groupByType(records)
  const openCount = records.filter(r => r.status?.toLowerCase() !== 'closed' && r.status?.toLowerCase() !== 'dismissed').length

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Public Records
            {landlordName ? ` — ${landlordName}` : ''}
          </h2>
          {records.length > 0 && (
            <p className="text-sm text-gray-500 mt-0.5">
              {records.length} total records · {openCount} open
            </p>
          )}
        </div>
        {openCount > 0 && (
          <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span className="text-sm font-semibold text-red-700">{openCount} Open</span>
          </div>
        )}
      </div>

      {/* FCRA disclaimer — must be prominent, not in fine print */}
      <FCRADisclaimer variant="short" />

      {/* Unclaimed warning */}
      {isUnclaimed && records.length > 0 && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <Info className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            These public records are associated with{' '}
            <strong>{propertyAddress ?? 'this property address'}</strong> but have not been linked to a
            verified landlord. The property owner has not claimed this profile.
          </p>
        </div>
      )}

      {records.length === 0 ? (
        <div className="border border-gray-200 rounded-lg p-6 text-center bg-gray-50">
          <p className="text-sm font-medium text-gray-600">No public records found</p>
          <p className="text-xs text-gray-400 mt-1">
            Our database covers major US cities. Coverage varies by location.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map(([type, typeRecords]) => (
            <div key={type}>
              <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                {RECORD_TYPE_LABELS[type as keyof typeof RECORD_TYPE_LABELS] ?? type}
                <span className="text-xs font-normal text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
                  {typeRecords.length}
                </span>
              </h3>
              <div className="space-y-2">
                {typeRecords.map(record => (
                  <RecordRow key={record.id} record={record} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
