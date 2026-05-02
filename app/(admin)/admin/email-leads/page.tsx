import type { Metadata } from 'next'
import { Mail, MapPin } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Email leads — Admin',
  robots: { index: false, follow: false },
}

interface Lead {
  id: string
  email: string
  source: string | null
  city: string | null
  state_abbr: string | null
  created_at: string
}

const SOURCE_TONE: Record<string, string> = {
  homepage: 'bg-slate-50 text-slate-700 border-slate-200',
  'homepage-cities': 'bg-slate-50 text-slate-700 border-slate-200',
  'homepage-city-alerts': 'bg-teal-50 text-teal-700 border-teal-200',
  city_alert_signup: 'bg-teal-50 text-teal-700 border-teal-200',
}

export default async function AdminEmailLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string; city?: string; limit?: string }>
}) {
  const params = await searchParams
  const limit = Math.min(parseInt(params.limit ?? '200'), 1000)
  const service = createServiceClient()

  let query = service
    .from('email_leads')
    .select('id, email, source, city, state_abbr, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (params.source) query = query.eq('source', params.source)
  if (params.city) query = query.ilike('city', `%${params.city}%`)

  const { data, error } = await query
  const rows = (data ?? []) as Lead[]

  // Summary stats — group by city.
  const byCity = new Map<string, number>()
  const bySource = new Map<string, number>()
  for (const r of rows) {
    if (r.city && r.state_abbr) {
      const key = `${r.city}, ${r.state_abbr}`
      byCity.set(key, (byCity.get(key) ?? 0) + 1)
    }
    const src = r.source ?? 'unknown'
    bySource.set(src, (bySource.get(src) ?? 0) + 1)
  }
  const topCities = Array.from(byCity.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8)
  const topSources = Array.from(bySource.entries()).sort((a, b) => b[1] - a[1])

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
          <Mail className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Email leads</h1>
          <p className="text-sm text-slate-500">{rows.length} captured · newest first</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Failed to load: {error.message}
        </div>
      )}

      {/* Summary panels */}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">Top cities requested</p>
          {topCities.length === 0 ? (
            <p className="text-sm text-slate-500">No city signups yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {topCities.map(([city, n]) => (
                <li key={city} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">{city}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-mono">{n}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">Sources</p>
          <ul className="space-y-1.5">
            {topSources.map(([src, n]) => (
              <li key={src} className="flex items-center justify-between text-sm">
                <span className="font-mono text-[12px] text-slate-700">{src}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-mono">{n}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Filters */}
      <form className="mb-4 flex items-center gap-2 text-sm">
        <input
          name="city"
          defaultValue={params.city ?? ''}
          placeholder="Filter by city…"
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
        />
        <input
          name="source"
          defaultValue={params.source ?? ''}
          placeholder="Filter by source…"
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
        />
        <button type="submit" className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white">
          Apply
        </button>
        {(params.city || params.source) && (
          <a href="/admin/email-leads" className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700">
            Clear
          </a>
        )}
      </form>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">City</th>
              <th className="px-4 py-3 text-left">Source</th>
              <th className="px-4 py-3 text-left">Captured</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {rows.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-400">No leads match.</td></tr>
            ) : (
              rows.map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-mono text-[12.5px] text-slate-900">
                    <a href={`mailto:${r.email}`} className="hover:underline">{r.email}</a>
                  </td>
                  <td className="px-4 py-2.5 text-slate-700">
                    {r.city && r.state_abbr ? (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-slate-400" /> {r.city}, {r.state_abbr}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${SOURCE_TONE[r.source ?? ''] ?? 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                      {r.source ?? 'unknown'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">{formatDate(r.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
