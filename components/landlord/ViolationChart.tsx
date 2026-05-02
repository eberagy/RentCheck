'use client'

import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { PublicRecord } from '@/types'

interface ViolationChartProps {
  records: PublicRecord[]
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
