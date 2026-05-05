'use client'

import { useMemo, useState } from 'react'
import {
  AlertTriangle, ChevronDown, ChevronUp, ExternalLink, Info,
  Filter, Hammer, Gavel, Building2, Flame, FileText, Search,
} from 'lucide-react'
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

// Display order for record-type sections. Most-actionable first; informational last.
const GROUP_ORDER = [
  'eviction', 'eviction_filing', 'lsc_eviction', 'sf_eviction',
  'court_case', 'court_listener',
  'hpd_violation', 'dob_violation', 'dob_complaint', 'boston_violation', 'philly_violation',
  'chicago_violation', 'pittsburgh_violation', 'baltimore_vacant_notice',
  'austin_complaint', 'seattle_violation', 'la_violation',
  '311_complaint', 'code_enforcement', 'nyc_311',
  'business_registration',
]

const INFORMATIONAL_TYPES = new Set(['business_registration'])
const COURT_TYPES = new Set([
  'eviction', 'eviction_filing', 'lsc_eviction', 'sf_eviction',
  'court_case', 'court_listener',
])

function categoryFor(type: string): 'eviction' | 'violation' | 'complaint' | 'info' {
  if (INFORMATIONAL_TYPES.has(type)) return 'info'
  if (COURT_TYPES.has(type)) return 'eviction'
  if (type.includes('complaint') || type === 'nyc_311' || type === '311_complaint') return 'complaint'
  return 'violation'
}

function iconFor(type: string) {
  if (COURT_TYPES.has(type)) return Gavel
  if (INFORMATIONAL_TYPES.has(type)) return Building2
  if (type === 'hpd_violation' || type === 'dob_violation' || type.endsWith('_violation')) return Hammer
  if (type.endsWith('_complaint') || type === 'nyc_311') return Flame
  return FileText
}

function isOpen(record: PublicRecord) {
  if (INFORMATIONAL_TYPES.has(record.record_type)) return false
  const status = record.status?.toLowerCase()
  return status !== 'closed' && status !== 'dismissed'
}

function groupByType(records: PublicRecord[]) {
  const grouped: Record<string, PublicRecord[]> = {}
  for (const r of records) {
    if (!grouped[r.record_type]) grouped[r.record_type] = []
    grouped[r.record_type]!.push(r)
  }
  for (const type in grouped) {
    grouped[type]!.sort((a, b) => {
      const aClosed = isOpen(a) ? 0 : 1
      const bClosed = isOpen(b) ? 0 : 1
      if (aClosed !== bClosed) return aClosed - bClosed
      const aDate = a.filed_date ? new Date(a.filed_date).getTime() : 0
      const bDate = b.filed_date ? new Date(b.filed_date).getTime() : 0
      return bDate - aDate
    })
  }
  return Object.entries(grouped).sort(([a], [b]) => {
    const ia = GROUP_ORDER.indexOf(a), ib = GROUP_ORDER.indexOf(b)
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
  })
}

function RecordRow({ record }: { record: PublicRecord }) {
  const [expanded, setExpanded] = useState(false)
  const open = isOpen(record)
  const informational = INFORMATIONAL_TYPES.has(record.record_type)

  return (
    <li
      className={
        'group relative flex flex-col gap-2 rounded-2xl border px-4 py-3 transition-colors sm:flex-row sm:items-start sm:gap-4 ' +
        (open
          ? 'border-red-100 bg-red-50/30 hover:border-red-200 hover:bg-red-50/50'
          : informational
            ? 'border-slate-200 bg-slate-50/60'
            : 'border-slate-200 bg-white hover:border-slate-300')
      }
    >
      {/* Severity indicator strip on the left */}
      <span
        aria-hidden="true"
        className={
          'absolute inset-y-3 left-0 w-[3px] rounded-r ' +
          (open ? 'bg-red-500' : informational ? 'bg-slate-300' : 'bg-slate-300')
        }
      />

      <div className="ml-2 min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {informational ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-slate-500">
              <Info className="h-3 w-3" /> Informational
            </span>
          ) : (
            <ViolationBadge
              severity={record.severity}
              status={record.status}
              violationClass={record.violation_class}
              size="sm"
            />
          )}
          {record.case_number && (
            <span className="font-mono text-[11px] text-slate-500">#{record.case_number}</span>
          )}
        </div>

        <p className="mt-1.5 text-[14px] font-medium leading-snug text-slate-900">
          {record.title}
        </p>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-slate-500">
          {record.filed_date && (
            <span>
              <span className="text-slate-400">Filed</span>{' '}
              <time dateTime={record.filed_date} className="font-medium text-slate-600">
                {formatDate(record.filed_date)}
              </time>
            </span>
          )}
          {record.closed_date && (
            <span>
              <span className="text-slate-400">Closed</span>{' '}
              <time dateTime={record.closed_date} className="font-medium text-slate-600">
                {formatDate(record.closed_date)}
              </time>
            </span>
          )}
          {record.source && (
            <span className="rounded-full bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-slate-500">
              {record.source.replace(/_/g, ' ')}
            </span>
          )}
        </div>

        {expanded && record.description && (
          <p className="mt-3 border-t border-slate-200/70 pt-3 text-[13.5px] leading-relaxed text-slate-700">
            {record.description}
          </p>
        )}

        <DataAccuracyNote source={record.source} lastSynced={record.last_synced_at} recordId={record.id} />
      </div>

      <div className="flex items-center gap-1 self-end sm:self-start sm:flex-shrink-0">
        {record.source_url && (
          <a
            href={record.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50"
            title="View original record on the city portal"
          >
            <ExternalLink className="h-3 w-3" />
            Source
          </a>
        )}
        {record.description && (
          <button
            type="button"
            onClick={() => setExpanded(e => !e)}
            aria-expanded={expanded}
            aria-label={expanded ? 'Collapse details' : 'Expand details'}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50"
          >
            {expanded ? 'Less' : 'Details'}
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        )}
      </div>
    </li>
  )
}

function RecordGroup({ type, records }: { type: string; records: PublicRecord[] }) {
  const [expanded, setExpanded] = useState(false)
  const COLLAPSED = 8
  const visible = expanded ? records : records.slice(0, COLLAPSED)
  const hidden = records.length - visible.length
  const Icon = iconFor(type)
  const openCount = records.filter(isOpen).length
  const label = RECORD_TYPE_LABELS[type as keyof typeof RECORD_TYPE_LABELS] ?? type
  const cat = categoryFor(type)

  return (
    <section>
      <header className="mb-3 flex items-center justify-between gap-3 border-b border-slate-100 pb-2">
        <div className="flex items-center gap-2.5">
          <span
            className={
              'flex h-7 w-7 items-center justify-center rounded-full ' +
              (cat === 'eviction'
                ? 'bg-red-100 text-red-600'
                : cat === 'violation'
                  ? 'bg-orange-100 text-orange-600'
                  : cat === 'complaint'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-slate-100 text-slate-500')
            }
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <h3 className="text-[14px] font-semibold text-slate-900">{label}</h3>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 tabular-nums">
            {records.length.toLocaleString()}
          </span>
          {openCount > 0 && cat !== 'info' && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700 tabular-nums">
              {openCount} open
            </span>
          )}
        </div>
      </header>

      <ul className="space-y-2.5">
        {visible.map(record => (
          <RecordRow key={record.id} record={record} />
        ))}
      </ul>

      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-3 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
        >
          Show {hidden.toLocaleString()} more
          <ChevronDown className="h-3 w-3" />
        </button>
      )}
      {expanded && records.length > COLLAPSED && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="mt-3 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-500 transition-colors hover:bg-slate-50"
        >
          Show fewer <ChevronUp className="h-3 w-3" />
        </button>
      )}
    </section>
  )
}

type StatusFilter = 'all' | 'open' | 'closed'

export function PublicRecordsPanel({ records, landlordName, isUnclaimed, propertyAddress }: PublicRecordsPanelProps) {
  const [filter, setFilter] = useState<StatusFilter>('all')

  const filtered = useMemo(() => {
    if (filter === 'all') return records
    if (filter === 'open') return records.filter(isOpen)
    return records.filter(r => !isOpen(r))
  }, [records, filter])

  const grouped = useMemo(() => groupByType(filtered), [filtered])

  const totals = useMemo(() => {
    let open = 0, closed = 0, info = 0
    for (const r of records) {
      if (INFORMATIONAL_TYPES.has(r.record_type)) info++
      else if (isOpen(r)) open++
      else closed++
    }
    return { open, closed, info }
  }, [records])

  return (
    <section className="space-y-5">
      {/* ── Header with summary stats ── */}
      <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Public records
            </p>
            <h2 className="mt-1 font-display text-[22px] leading-tight tracking-tight text-slate-950">
              {landlordName ? `${landlordName}'s record` : 'Record summary'}
            </h2>
            {records.length > 0 ? (
              <p className="mt-1 text-[13px] text-slate-500">
                {records.length.toLocaleString()} total record{records.length === 1 ? '' : 's'} from city + state government databases
              </p>
            ) : (
              <p className="mt-1 text-[13px] text-slate-500">
                No public records found in our coverage area.
              </p>
            )}
          </div>
        </div>

        {records.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-2.5 sm:grid-cols-3 sm:gap-3">
            <SummaryStat
              tone="rose"
              label="Open"
              value={totals.open}
              icon={<AlertTriangle className="h-3.5 w-3.5" />}
              hint="Currently active"
            />
            <SummaryStat
              tone="slate"
              label="Closed"
              value={totals.closed}
              icon={<ChevronDown className="h-3.5 w-3.5 rotate-180" />}
              hint="Resolved or dismissed"
            />
            <SummaryStat
              tone="neutral"
              label="Total"
              value={records.length}
              icon={<FileText className="h-3.5 w-3.5" />}
              hint="All records on file"
            />
          </div>
        )}

        {/* FCRA disclaimer */}
        <div className="mt-4">
          <FCRADisclaimer variant="short" />
        </div>

        {/* Unclaimed warning */}
        {isUnclaimed && records.length > 0 && (
          <div className="mt-3 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
            <p className="text-[13px] leading-6 text-amber-900">
              These public records are associated with{' '}
              <strong>{propertyAddress ?? 'this landlord'}</strong> but the owner hasn&apos;t claimed
              this profile to provide context.
            </p>
          </div>
        )}
      </header>

      {/* ── Filter tabs ── */}
      {records.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 rounded-full border border-slate-200 bg-white p-1 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:w-fit">
          <FilterTab
            active={filter === 'all'}
            onClick={() => setFilter('all')}
            count={records.length}
          >
            <Filter className="h-3 w-3" /> All
          </FilterTab>
          <FilterTab
            active={filter === 'open'}
            onClick={() => setFilter('open')}
            count={totals.open}
            tone="rose"
          >
            <AlertTriangle className="h-3 w-3" /> Open
          </FilterTab>
          <FilterTab
            active={filter === 'closed'}
            onClick={() => setFilter('closed')}
            count={totals.closed}
          >
            Closed
          </FilterTab>
        </div>
      )}

      {/* ── Records ── */}
      {records.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
            <Search className="h-5 w-5 text-slate-400" aria-hidden="true" />
          </div>
          <p className="font-medium text-slate-700">No public records found</p>
          <p className="mx-auto mt-1 max-w-xs text-[13px] text-slate-500">
            Our database covers 50+ city + state governments. Coverage varies by location.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
          <p className="text-[13px] text-slate-500">
            No {filter === 'open' ? 'open' : 'closed'} records match the current filter.
          </p>
        </div>
      ) : (
        <div className="space-y-7">
          {grouped.map(([type, typeRecords]) => (
            <RecordGroup
              key={type}
              type={type}
              records={typeRecords}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function SummaryStat({
  tone,
  label,
  value,
  icon,
  hint,
}: {
  tone: 'rose' | 'slate' | 'neutral'
  label: string
  value: number
  icon: React.ReactNode
  hint: string
}) {
  const styles = tone === 'rose'
    ? 'border-red-100 bg-red-50/60 text-red-700'
    : tone === 'slate'
      ? 'border-slate-200 bg-slate-50 text-slate-700'
      : 'border-slate-200 bg-white text-slate-700'
  return (
    <div className={`rounded-2xl border px-3 py-3 ${styles}`}>
      <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider opacity-90">
        {icon}
        {label}
      </div>
      <div className="mt-1 font-display text-[24px] font-semibold leading-none tracking-tight tabular-nums">
        {value.toLocaleString()}
      </div>
      <div className="mt-0.5 text-[10.5px] opacity-70">{hint}</div>
    </div>
  )
}

function FilterTab({
  active,
  onClick,
  count,
  tone = 'neutral',
  children,
}: {
  active: boolean
  onClick: () => void
  count: number
  tone?: 'rose' | 'neutral'
  children: React.ReactNode
}) {
  const baseActive = tone === 'rose'
    ? 'bg-red-600 text-white shadow-sm'
    : 'bg-slate-900 text-white shadow-sm'
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition-colors ' +
        (active ? baseActive : 'text-slate-600 hover:bg-slate-50')
      }
      aria-pressed={active}
    >
      {children}
      <span className={
        'rounded-full px-1.5 py-px text-[11px] tabular-nums ' +
        (active ? 'bg-white/15' : 'bg-slate-100 text-slate-500')
      }>
        {count.toLocaleString()}
      </span>
    </button>
  )
}
