'use client'

import { useMemo, useState } from 'react'
import {
  AlertTriangle, ChevronDown, ChevronUp, ExternalLink, Info,
  Filter, Hammer, Gavel, Building2, Flame, FileText, Search,
  Clock, MapPin, Calendar, BadgeCheck, AlertOctagon,
} from 'lucide-react'
import { ViolationBadge } from './ViolationBadge'
import { FCRADisclaimer } from '@/components/compliance/FCRADisclaimer'
import { DataAccuracyNote } from '@/components/compliance/DataAccuracyNote'
import { formatDate } from '@/lib/utils'
import { RECORD_TYPE_LABELS } from '@/types'
import type { PublicRecord } from '@/types'
import { extractRecordDetails } from '@/lib/records/extract'
import {
  INFORMATIONAL_RECORD_TYPES,
  COURT_RECORD_TYPES,
  categoryForRecordType,
  recordIsOpen,
  daysUntil,
  recordGroupSortIndex,
} from '@/lib/records/grouping'

// PublicRecord rows on this page also carry the joined property address
// (from the supabase select on the landlord page).
type PropertyMini = { address_line1: string | null; city: string | null; state_abbr: string | null; zip: string | null } | null
type EnrichedRecord = PublicRecord & { property?: PropertyMini }

interface PublicRecordsPanelProps {
  records: EnrichedRecord[]
  landlordName: string
  isUnclaimed?: boolean
  propertyAddress?: string
  /** Optional chart/visualization rendered inside the sticky left aside.
   *  The landlord page passes <ViolationChart /> here so the dashboard
   *  travels with the user as they scroll the records list. */
  chart?: React.ReactNode
}

// Local alias so the records panel reads the renamed helpers under
// the names the JSX below already uses.
const isOpen = recordIsOpen
const categoryFor = categoryForRecordType
const INFORMATIONAL_TYPES = INFORMATIONAL_RECORD_TYPES
const COURT_TYPES = COURT_RECORD_TYPES

function iconFor(type: string) {
  if (COURT_TYPES.has(type)) return Gavel
  if (INFORMATIONAL_TYPES.has(type)) return Building2
  if (type.endsWith('_complaint') || type === 'nyc_311') return Flame
  return Hammer
}

function groupByType(records: EnrichedRecord[]) {
  const grouped: Record<string, EnrichedRecord[]> = {}
  for (const r of records) {
    if (!grouped[r.record_type]) grouped[r.record_type] = []
    grouped[r.record_type]!.push(r)
  }
  for (const type in grouped) {
    grouped[type]!.sort((a, b) => {
      const aOpen = isOpen(a) ? 0 : 1
      const bOpen = isOpen(b) ? 0 : 1
      if (aOpen !== bOpen) return aOpen - bOpen
      const aDate = a.filed_date ? new Date(a.filed_date).getTime() : 0
      const bDate = b.filed_date ? new Date(b.filed_date).getTime() : 0
      return bDate - aDate
    })
  }
  return Object.entries(grouped).sort(([a], [b]) =>
    recordGroupSortIndex(a) - recordGroupSortIndex(b)
  )
}

function MetaPill({ icon, label, value, tone = 'neutral' }: {
  icon?: React.ReactNode
  label: string
  value: React.ReactNode
  tone?: 'neutral' | 'red' | 'amber' | 'teal'
}) {
  const styles = tone === 'red'
    ? 'border-red-100 bg-red-50/60 text-red-700'
    : tone === 'amber'
      ? 'border-amber-100 bg-amber-50/60 text-amber-800'
      : tone === 'teal'
        ? 'border-teal-100 bg-teal-50/60 text-teal-700'
        : 'border-slate-200 bg-white text-slate-700'
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${styles}`}>
      {icon}
      <span className="text-[10px] uppercase tracking-wide opacity-60">{label}</span>
      <span className="font-semibold">{value}</span>
    </span>
  )
}

function RecordRow({ record }: { record: EnrichedRecord }) {
  const [expanded, setExpanded] = useState(false)
  const details = useMemo(() => extractRecordDetails(record.source, record.raw_data), [record.source, record.raw_data])
  const open = isOpen(record, details)
  const informational = INFORMATIONAL_TYPES.has(record.record_type)
  const fullAddress = record.property
    ? [record.property.address_line1, record.property.city, record.property.state_abbr]
        .filter(Boolean)
        .join(', ')
        + (record.property.zip ? ` ${record.property.zip}` : '')
    : null
  const correctIn = daysUntil(details.correctByDate)
  const overdue = correctIn !== null && correctIn < 0 && open

  return (
    <li
      className={
        'group relative rounded-2xl border px-4 py-3.5 transition-colors ' +
        (overdue
          ? 'border-red-200 bg-red-50/50 hover:border-red-300'
          : open
            ? 'border-red-100 bg-red-50/30 hover:border-red-200 hover:bg-red-50/50'
            : informational
              ? 'border-slate-200 bg-slate-50/60'
              : 'border-slate-200 bg-white hover:border-slate-300')
      }
    >
      {/* Severity rail */}
      <span
        aria-hidden="true"
        className={
          'absolute inset-y-3 left-0 w-[3px] rounded-r ' +
          (overdue ? 'bg-red-600' : open ? 'bg-red-500' : informational ? 'bg-slate-300' : 'bg-slate-300')
        }
      />

      {/* Top row: badge + case id + actions */}
      <div className="ml-2 flex flex-wrap items-start gap-2">
        {informational ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-slate-500">
            <Info className="h-3 w-3" aria-hidden="true" /> Informational
          </span>
        ) : (
          <ViolationBadge
            severity={record.severity}
            status={record.status}
            violationClass={record.violation_class}
            size="sm"
          />
        )}
        {details.rentImpairing && (
          <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-100 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-red-700">
            <AlertOctagon className="h-3 w-3" aria-hidden="true" /> Rent-impairing
          </span>
        )}
        {overdue && (
          <span className="inline-flex items-center gap-1 rounded-full border border-red-300 bg-red-100 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-red-700">
            <Clock className="h-3 w-3" aria-hidden="true" /> Overdue {Math.abs(correctIn!)}d
          </span>
        )}
        {(details.caseId ?? record.case_number) && (
          <span className="font-mono text-[11px] text-slate-500">
            #{details.caseId ?? record.case_number}
          </span>
        )}

        <div className="ml-auto flex items-center gap-1">
          {(record.source_url ?? details.citationLink) && (
            <a
              href={(record.source_url ?? details.citationLink) as string}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View record on city portal (opens in new tab)"
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500 focus-visible:ring-offset-2"
              title="View on city portal"
            >
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
              City portal
            </a>
          )}
          {(record.description || details.inspectorComments) && (
            <button
              type="button"
              onClick={() => setExpanded(e => !e)}
              aria-expanded={expanded}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
            >
              {expanded ? 'Less' : 'Details'}
              {expanded ? <ChevronUp className="h-3 w-3" aria-hidden="true" /> : <ChevronDown className="h-3 w-3" aria-hidden="true" />}
            </button>
          )}
        </div>
      </div>

      {/* Title + body line */}
      <p className="ml-2 mt-2 text-[14px] font-semibold leading-snug text-slate-900">
        {record.title}
      </p>

      {/* Address */}
      {fullAddress && (
        <p className="ml-2 mt-1 flex items-center gap-1 text-[12px] text-slate-500">
          <MapPin className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
          <span className="truncate">{fullAddress}</span>
          {details.apartment && (
            <span className="rounded-md bg-slate-100 px-1.5 py-px font-mono text-[10px] text-slate-700">
              Apt {details.apartment}
            </span>
          )}
          {details.borough && !record.property && (
            <span className="rounded-md bg-slate-100 px-1.5 py-px font-mono text-[10px] text-slate-700">
              {details.borough}
            </span>
          )}
        </p>
      )}

      {/* Meta pills row */}
      <div className="ml-2 mt-2.5 flex flex-wrap gap-1.5">
        {record.filed_date && (
          <MetaPill
            icon={<Calendar className="h-3 w-3" aria-hidden="true" />}
            label="Filed"
            value={<time dateTime={record.filed_date}>{formatDate(record.filed_date)}</time>}
          />
        )}
        {details.inspectionDate && (
          <MetaPill
            icon={<BadgeCheck className="h-3 w-3" aria-hidden="true" />}
            label="Inspected"
            value={<time dateTime={details.inspectionDate}>{formatDate(details.inspectionDate)}</time>}
          />
        )}
        {details.correctByDate && (
          <MetaPill
            icon={<Clock className="h-3 w-3" aria-hidden="true" />}
            label="Correct by"
            value={<time dateTime={details.correctByDate}>{formatDate(details.correctByDate)}</time>}
            tone={overdue ? 'red' : open ? 'amber' : 'neutral'}
          />
        )}
        {record.closed_date && (
          <MetaPill
            icon={<Calendar className="h-3 w-3" aria-hidden="true" />}
            label="Closed"
            value={<time dateTime={record.closed_date}>{formatDate(record.closed_date)}</time>}
            tone="teal"
          />
        )}
        {details.daysOpen !== null && details.daysOpen !== undefined && open && (
          <MetaPill
            icon={<Clock className="h-3 w-3" aria-hidden="true" />}
            label="Open"
            value={`${details.daysOpen}d`}
            tone="amber"
          />
        )}
        {record.status && !overdue && (
          <MetaPill
            label="Status"
            value={record.status.toLowerCase()}
          />
        )}
        {details.ordinanceCode && (
          <MetaPill
            label="Code"
            value={<span className="font-mono">{details.ordinanceCode.length > 38 ? details.ordinanceCode.slice(0, 38) + '…' : details.ordinanceCode}</span>}
          />
        )}
        {details.neighborhood && (
          <MetaPill
            label="Area"
            value={details.neighborhood}
          />
        )}
        {details.agent && (
          <MetaPill
            label="By"
            value={details.agent}
          />
        )}
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="ml-2 mt-3 space-y-2 border-t border-slate-200/70 pt-3 text-[13px] leading-relaxed text-slate-700">
          {record.description && (
            <p>{record.description}</p>
          )}
          {details.inspectorComments && (
            <div className="rounded-xl bg-slate-50 px-3 py-2 text-[12.5px] text-slate-700">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">Inspector notes</span>
              <p className="mt-1 leading-relaxed">{details.inspectorComments}</p>
            </div>
          )}
          {(details.bbl || details.buildingId) && (
            <p className="text-[11.5px] text-slate-500">
              {details.bbl && <span>BBL <span className="font-mono">{details.bbl}</span></span>}
              {details.bbl && details.buildingId && ' · '}
              {details.buildingId && <span>BIN <span className="font-mono">{details.buildingId}</span></span>}
            </p>
          )}
        </div>
      )}

      <div className="ml-2 mt-2">
        <DataAccuracyNote source={record.source} lastSynced={record.last_synced_at} recordId={record.id} />
      </div>
    </li>
  )
}

function RecordGroup({ type, records }: { type: string; records: EnrichedRecord[] }) {
  const [expanded, setExpanded] = useState(false)
  const COLLAPSED = 6
  const visible = expanded ? records : records.slice(0, COLLAPSED)
  const hidden = records.length - visible.length
  const Icon = iconFor(type)
  const openCount = records.filter(r => isOpen(r)).length
  const label = RECORD_TYPE_LABELS[type as keyof typeof RECORD_TYPE_LABELS] ?? type
  const cat = categoryFor(type)

  // Collect distinct boroughs/areas in this group for a header chip
  const distinctAreas = useMemo(() => {
    const seen = new Set<string>()
    for (const r of records) {
      const d = extractRecordDetails(r.source, r.raw_data)
      if (d.borough) seen.add(d.borough)
    }
    return Array.from(seen).slice(0, 3)
  }, [records])

  return (
    <section>
      <header className="mb-3 flex flex-wrap items-center gap-2.5 border-b border-slate-100 pb-2.5">
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
            {openCount.toLocaleString()} open
          </span>
        )}
        {distinctAreas.length > 0 && (
          <div className="ml-auto hidden gap-1 sm:flex">
            {distinctAreas.map(b => (
              <span key={b} className="rounded-full bg-slate-50 px-2 py-0.5 text-[10.5px] font-medium text-slate-500">
                {b}
              </span>
            ))}
          </div>
        )}
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
          aria-expanded={false}
          className="mt-3 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
        >
          Show {hidden.toLocaleString()} more
          <ChevronDown className="h-3 w-3" aria-hidden="true" />
        </button>
      )}
      {expanded && records.length > COLLAPSED && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          aria-expanded={true}
          className="mt-3 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-500 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
        >
          Show fewer <ChevronUp className="h-3 w-3" aria-hidden="true" />
        </button>
      )}
    </section>
  )
}

type StatusFilter = 'all' | 'open' | 'closed'

export function PublicRecordsPanel({ records, landlordName, isUnclaimed, propertyAddress, chart }: PublicRecordsPanelProps) {
  const [filter, setFilter] = useState<StatusFilter>('all')

  // Pre-extract details once to avoid recomputing in the open/closed filter.
  const enriched = useMemo(
    () => records.map(r => ({ r, isOpen: isOpen(r, extractRecordDetails(r.source, r.raw_data)) })),
    [records],
  )

  const filtered = useMemo(() => {
    const list = filter === 'open'
      ? enriched.filter(e => e.isOpen)
      : filter === 'closed'
        ? enriched.filter(e => !e.isOpen)
        : enriched
    return list.map(e => e.r)
  }, [enriched, filter])

  const grouped = useMemo(() => groupByType(filtered), [filtered])

  const totals = useMemo(() => {
    let open = 0, closed = 0, info = 0, overdue = 0, rentImpairing = 0
    for (const r of records) {
      if (INFORMATIONAL_TYPES.has(r.record_type)) { info++; continue }
      const d = extractRecordDetails(r.source, r.raw_data)
      const ro = isOpen(r, d)
      if (ro) {
        open++
        const dueIn = daysUntil(d.correctByDate)
        if (dueIn !== null && dueIn < 0) overdue++
        if (d.rentImpairing) rentImpairing++
      } else closed++
    }
    return { open, closed, info, overdue, rentImpairing }
  }, [records])

  return (
    <section className="space-y-5">
      {chart}

      {records.length > 0 && (
        <div className="grid gap-2.5 sm:grid-cols-4">
          <SummaryStat
            tone="rose"
            label="Open"
            value={totals.open}
            icon={<AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />}
            hint="Active issues"
          />
          <SummaryStat
            tone="amber"
            label="Overdue"
            value={totals.overdue}
            icon={<Clock className="h-3.5 w-3.5" aria-hidden="true" />}
            hint="Past correct-by date"
          />
          <SummaryStat
            tone="slate"
            label="Closed"
            value={totals.closed}
            icon={<BadgeCheck className="h-3.5 w-3.5" />}
            hint="Resolved or dismissed"
          />
          <SummaryStat
            tone="neutral"
            label="Total"
            value={records.length}
            icon={<FileText className="h-3.5 w-3.5" aria-hidden="true" />}
            hint="On file"
          />
        </div>
      )}

      {totals.rentImpairing > 0 && (
        <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
          <AlertOctagon className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600" />
          <span className="text-[13px] leading-relaxed text-red-800">
            <strong>{totals.rentImpairing.toLocaleString()} rent-impairing</strong>{' '}
            violation{totals.rentImpairing === 1 ? '' : 's'} on file — these directly affect habitability.
          </span>
        </div>
      )}

      {records.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="flex items-center gap-2 text-[13px] text-slate-600">
            <p className="font-semibold text-slate-900">
              {landlordName ? `${landlordName}'s record` : 'Record summary'}
            </p>
            <span className="hidden h-3 w-px bg-slate-200 sm:inline-block" aria-hidden="true" />
            <span className="hidden text-slate-500 sm:inline">
              {records.length.toLocaleString()} record{records.length === 1 ? '' : 's'} aggregated from city + state databases
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1 rounded-full border border-slate-200 bg-white p-1">
            <FilterTab active={filter === 'all'} onClick={() => setFilter('all')} count={records.length}>
              <Filter className="h-3 w-3" aria-hidden="true" /> All
            </FilterTab>
            <FilterTab active={filter === 'open'} onClick={() => setFilter('open')} count={totals.open} tone="rose">
              <AlertTriangle className="h-3 w-3" aria-hidden="true" /> Open
            </FilterTab>
            <FilterTab active={filter === 'closed'} onClick={() => setFilter('closed')} count={totals.closed}>
              Closed
            </FilterTab>
          </div>
        </div>
      )}

      <FCRADisclaimer variant="short" />

      {isUnclaimed && records.length > 0 && (
        <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" aria-hidden="true" />
          <p className="text-[13px] leading-6 text-amber-900">
            These public records are associated with{' '}
            <strong>{propertyAddress ?? 'this landlord'}</strong> but the owner hasn&apos;t claimed
            this profile to provide context.
          </p>
        </div>
      )}

      {records.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
            <Search className="h-5 w-5 text-slate-400" aria-hidden="true" />
          </div>
          <p className="font-medium text-slate-700">No public records found</p>
          <p className="mx-auto mt-1 max-w-xs text-[13px] text-slate-500">
            Our database covers 50+ city + state governments. Coverage varies by location.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
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
  tone: 'rose' | 'amber' | 'slate' | 'neutral'
  label: string
  value: number
  icon: React.ReactNode
  hint: string
}) {
  const styles = tone === 'rose'
    ? 'border-red-100 bg-red-50/60 text-red-700'
    : tone === 'amber'
      ? 'border-amber-100 bg-amber-50/60 text-amber-800'
      : tone === 'slate'
        ? 'border-slate-200 bg-slate-50 text-slate-700'
        : 'border-slate-200 bg-white text-slate-700'
  return (
    <div className={`rounded-2xl border px-3 py-3 ${styles}`}>
      <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider opacity-90">
        <span aria-hidden="true" className="inline-flex items-center">{icon}</span>
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
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 ' +
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
