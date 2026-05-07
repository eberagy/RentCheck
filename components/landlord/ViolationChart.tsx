'use client'

import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react'
import type { PublicRecord } from '@/types'

interface ViolationChartProps {
  records: PublicRecord[]
}

const INFORMATIONAL_TYPES = new Set(['business_registration'])

export function ViolationChart({ records }: ViolationChartProps) {
  const { data, totals } = useMemo(() => {
    const byYear: Record<number, { open: number; closed: number }> = {}
    let totalOpen = 0
    let totalClosed = 0
    let totalUnknown = 0
    for (const r of records) {
      if (INFORMATIONAL_TYPES.has(r.record_type)) continue
      const date = r.filed_date ?? r.created_at
      if (!date) { totalUnknown++; continue }
      const year = new Date(date).getFullYear()
      if (year < 2000 || year > new Date().getFullYear()) { totalUnknown++; continue }
      const closed = r.status?.toLowerCase() === 'closed' || r.status?.toLowerCase() === 'dismissed'
      if (!byYear[year]) byYear[year] = { open: 0, closed: 0 }
      if (closed) {
        byYear[year].closed += 1
        totalClosed++
      } else {
        byYear[year].open += 1
        totalOpen++
      }
    }

    const years = Object.keys(byYear).map(Number).sort()
    if (!years.length) {
      return { data: [], totals: { open: totalOpen, closed: totalClosed, unknown: totalUnknown } }
    }

    const minYear = years[0] ?? 2000
    const maxYear = years[years.length - 1] ?? new Date().getFullYear()
    const result: { year: string; open: number; closed: number; total: number }[] = []
    for (let y = minYear; y <= maxYear; y++) {
      const slot = byYear[y] ?? { open: 0, closed: 0 }
      result.push({ year: String(y), open: slot.open, closed: slot.closed, total: slot.open + slot.closed })
    }
    return { data: result, totals: { open: totalOpen, closed: totalClosed, unknown: totalUnknown } }
  }, [records])

  if (!data.length) return null

  const peakYear = data.reduce((acc, d) => (d.total > acc.total ? d : acc), data[0]!)

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-6">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Violation history
          </p>
          <h2 className="mt-1 font-display text-[20px] leading-tight tracking-tight text-slate-950">
            By year — open vs closed
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[12px] text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-red-500" /> Open
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-slate-300" /> Closed
          </span>
        </div>
      </header>

      {/* Summary chips */}
      <div className="mb-5 grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-red-100 bg-red-50/60 px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-red-700">
            <AlertTriangle className="h-3 w-3" /> Open
          </div>
          <div className="mt-0.5 font-display text-[22px] font-semibold leading-none tracking-tight text-red-700 tabular-nums">
            {totals.open.toLocaleString()}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-slate-600">
            <CheckCircle2 className="h-3 w-3" /> Closed
          </div>
          <div className="mt-0.5 font-display text-[22px] font-semibold leading-none tracking-tight text-slate-700 tabular-nums">
            {totals.closed.toLocaleString()}
          </div>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50/60 px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-amber-700">
            <TrendingUp className="h-3 w-3" /> Peak year
          </div>
          <div className="mt-0.5 font-display text-[22px] font-semibold leading-none tracking-tight text-amber-700 tabular-nums">
            {peakYear.year}
          </div>
          <div className="text-[10.5px] text-amber-700/80">{peakYear.total} records</div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 6, right: 6, left: -22, bottom: 0 }}
            barCategoryGap={8}
          >
            <CartesianGrid strokeDasharray="2 4" stroke="#eef2f7" vertical={false} />
            <XAxis
              dataKey="year"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
              dy={4}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
              width={34}
            />
            <Tooltip
              cursor={{ fill: 'rgba(241, 245, 249, 0.6)' }}
              contentStyle={{
                fontSize: 12,
                borderRadius: 12,
                border: '1px solid #e2e8f0',
                boxShadow: '0 8px 24px -8px rgba(15,23,42,0.16)',
                padding: '10px 12px',
              }}
              labelStyle={{ color: '#0f172a', fontWeight: 600, marginBottom: 4 }}
              itemStyle={{ color: '#475569' }}
              formatter={(value: number, name) => {
                const label = name === 'open' ? 'Open' : 'Closed'
                return [`${value} record${value !== 1 ? 's' : ''}`, label]
              }}
              labelFormatter={(label) => `Year ${label}`}
            />
            {/* Stacked: closed on bottom (gray), open stacked on top (red).
                Stacking makes year-over-year severity instantly readable. */}
            <Bar dataKey="closed" stackId="rec" radius={[0, 0, 0, 0]}>
              {data.map((_, i) => <Cell key={`c-${i}`} fill="#cbd5e1" />)}
            </Bar>
            <Bar dataKey="open" stackId="rec" radius={[6, 6, 0, 0]}>
              {data.map((_, i) => <Cell key={`o-${i}`} fill="#ef4444" />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-center text-[11.5px] text-slate-400">
        {records.length.toLocaleString()} total records
        {totals.unknown > 0 && ` · ${totals.unknown} undated`}
      </p>
    </section>
  )
}
