'use client'

import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { PublicRecord } from '@/types'

interface ViolationChartProps {
  records: PublicRecord[]
}

const TYPE_COLORS: Record<string, string> = {
  hpd_violation: '#ef4444',
  dob_violation: '#f97316',
  dob_complaint: '#fb923c',
  eviction: '#dc2626',
  eviction_filing: '#dc2626',
  lsc_eviction: '#dc2626',
  court_case: '#7c3aed',
  court_listener: '#7c3aed',
  chicago_violation: '#ef4444',
  pittsburgh_violation: '#ef4444',
  baltimore_vacant_notice: '#f97316',
  sf_violation: '#ef4444',
  sf_eviction: '#dc2626',
  boston_violation: '#ef4444',
  philly_violation: '#ef4444',
  austin_complaint: '#fb923c',
  seattle_violation: '#ef4444',
  la_violation: '#ef4444',
  code_enforcement: '#f59e0b',
  code_violation: '#f59e0b',
  '311_complaint': '#f59e0b',
  // Newer record types — keep informational ones distinct from violations.
  business_registration: '#94a3b8',
  hud_inspection: '#0ea5e9',
  nyc_311: '#f59e0b',
  // City-specific violations defaulting to red:
  houston_violation: '#ef4444',
  miami_violation: '#ef4444',
  denver_violation: '#ef4444',
  dallas_violation: '#ef4444',
  dc_violation: '#ef4444',
  atlanta_violation: '#ef4444',
  nashville_violation: '#ef4444',
  phoenix_violation: '#ef4444',
  minneapolis_violation: '#ef4444',
  portland_violation: '#ef4444',
  san_antonio_violation: '#ef4444',
  detroit_violation: '#ef4444',
  charlotte_violation: '#ef4444',
  columbus_violation: '#ef4444',
}

export function ViolationChart({ records }: ViolationChartProps) {
  const data = useMemo(() => {
    const byYear: Record<number, number> = {}
    for (const r of records) {
      const date = r.filed_date ?? r.created_at
      if (!date) continue
      const year = new Date(date).getFullYear()
      if (year < 2000 || year > new Date().getFullYear()) continue
      byYear[year] = (byYear[year] ?? 0) + 1
    }

    const years = Object.keys(byYear).map(Number).sort()
    if (!years.length) return []

    // Fill gaps between min and max year
    const minYear = years[0] ?? 2000
    const maxYear = years[years.length - 1] ?? new Date().getFullYear()
    const result = []
    for (let y = minYear; y <= maxYear; y++) {
      result.push({ year: String(y), count: byYear[y] ?? 0 })
    }
    return result
  }, [records])

  if (!data.length) return null

  const maxCount = Math.max(...data.map(d => d.count))

  return (
    <div className="mt-4 pt-4 border-t border-gray-100">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Violations by Year</h3>
      <div className="h-36">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis
              dataKey="year"
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
              formatter={(value: number) => [`${value} record${value !== 1 ? 's' : ''}`, '']}
              labelFormatter={(label) => `Year ${label}`}
            />
            <Bar dataKey="count" radius={[3, 3, 0, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.count === maxCount ? '#ef4444' : '#fca5a5'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-gray-400 mt-1 text-center">Public records filed per year · {records.length} total</p>
    </div>
  )
}
