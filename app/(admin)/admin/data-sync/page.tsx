'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, CheckCircle2, XCircle, Clock, Play, Loader2, AlertTriangle, Zap } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'

type SyncJob = {
  id: string
  source: string
  status: 'success' | 'error' | 'running' | 'partial'
  started_at: string
  finished_at: string | null
  records_added: number | null
  records_updated: number | null
  records_skipped: number | null
  error_message: string | null
}

const SYNC_SOURCES = [
  // NYC
  { id: 'nyc-hpd',          label: 'NYC HPD Violations',      schedule: 'Daily 2am',         description: 'NYC Housing Preservation & Development housing violations' },
  { id: 'nyc-dob',          label: 'NYC DOB Complaints',      schedule: 'Daily 2:30am',       description: 'NYC Dept of Buildings complaints and violations' },
  { id: 'nyc-registration', label: 'NYC Rent Registration',   schedule: 'Daily 3am',          description: 'NYC rent-stabilized building landlord registration (~50k landlords)' },
  { id: 'nyc-311',          label: 'NYC 311 Housing',         schedule: 'Daily 3:30am',       description: 'Heat, mold, pests, water leak complaints via 311' },
  // Original cities
  { id: 'chicago',          label: 'Chicago Violations',      schedule: 'Daily 4am',          description: 'Chicago Dept of Buildings violations' },
  { id: 'sf',               label: 'San Francisco',           schedule: 'Daily 4am',          description: 'SF Housing violations (DataSF)' },
  { id: 'boston',           label: 'Boston Inspections',      schedule: 'Daily 4:30am',       description: 'Boston Inspectional Services violations' },
  { id: 'philadelphia',     label: 'Philadelphia L&I',        schedule: 'Daily 5am',          description: 'Philadelphia Licenses & Inspections violations' },
  { id: 'baltimore',        label: 'Baltimore Vacant Notices',schedule: 'Daily 5am',          description: 'Baltimore open vacant-building notices' },
  { id: 'pittsburgh',       label: 'Pittsburgh PLI',          schedule: 'Daily 5am',          description: 'Pittsburgh PLI/DOMI/ES property violations' },
  { id: 'austin',           label: 'Austin Complaints',       schedule: 'Daily 5:45am',       description: 'Austin code complaints' },
  { id: 'seattle',          label: 'Seattle Violations',      schedule: 'Daily 6am',          description: 'Seattle rental housing code violations' },
  { id: 'los-angeles',      label: 'Los Angeles LAHD',        schedule: 'Daily 6:15am',       description: 'LA Housing Dept code violations' },
  { id: 'houston',          label: 'Houston Code',            schedule: 'Daily 6:30am',       description: 'Houston code enforcement violations' },
  { id: 'miami',            label: 'Miami-Dade',              schedule: 'Daily 6:45am',       description: 'Miami-Dade code compliance violations' },
  { id: 'denver',           label: 'Denver Code',             schedule: 'Daily 7am',          description: 'Denver code enforcement cases' },
  { id: 'dallas',           label: 'Dallas Code',             schedule: 'Daily 7:15am',       description: 'Dallas code violation cases' },
  { id: 'dc',               label: 'Washington DC',           schedule: 'Daily 7:30am',       description: 'DC DCRA housing & building violations' },
  { id: 'atlanta',          label: 'Atlanta Permits',         schedule: 'Daily 7:45am',       description: 'Atlanta building permits & code violations' },
  { id: 'nashville',        label: 'Nashville Code',          schedule: 'Daily 8am',          description: 'Nashville code enforcement violations' },
  // New cities
  { id: 'phoenix',          label: 'Phoenix Code',            schedule: 'Daily 8:15am',       description: 'Phoenix code enforcement cases' },
  { id: 'minneapolis',      label: 'Minneapolis Code',        schedule: 'Daily 8:30am',       description: 'Minneapolis code compliance complaints' },
  { id: 'portland',         label: 'Portland BDS',            schedule: 'Daily 8:45am',       description: 'Portland Bureau of Development Services violations' },
  { id: 'san-antonio',      label: 'San Antonio Code',        schedule: 'Daily 9am',          description: 'San Antonio code enforcement cases' },
  { id: 'detroit',          label: 'Detroit Blight',          schedule: 'Daily 9:15am',       description: 'Detroit blight violations' },
  { id: 'charlotte',        label: 'Charlotte Code',          schedule: 'Daily 9:30am',       description: 'Charlotte code enforcement cases' },
  { id: 'columbus',         label: 'Columbus Code',           schedule: 'Daily 9:45am',       description: 'Columbus code violations' },
  // National / federal
  { id: 'hud-inspections',  label: 'HUD Inspections',         schedule: 'Weekly Monday',      description: 'HUD REAC physical inspection scores for subsidized housing' },
  { id: 'court-listener',   label: 'CourtListener Cases',     schedule: 'Weekly Monday',      description: 'Federal court eviction & housing cases (requires COURT_LISTENER_TOKEN)' },
  { id: 'lsc-evictions',    label: 'LSC Eviction Data',       schedule: 'Monthly 1st',        description: 'County-level eviction filing counts (9 states)' },
]

export default function AdminDataSyncPage() {
  const [syncLogs, setSyncLogs] = useState<Record<string, SyncJob[]>>({})
  const [loading, setLoading] = useState(true)
  const [triggering, setTriggering] = useState<Set<string>>(new Set())
  const [runningAll, setRunningAll] = useState(false)
  const supabase = createClient()

  useEffect(() => { loadLogs() }, []) // eslint-disable-line

  async function loadLogs() {
    setLoading(true)
    const { data } = await supabase
      .from('sync_log')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(200)

    const grouped: Record<string, SyncJob[]> = {}
    for (const log of (data ?? []) as SyncJob[]) {
      if (!grouped[log.source]) grouped[log.source] = []
      if ((grouped[log.source]?.length ?? 0) < 5) grouped[log.source]!.push(log)
    }
    setSyncLogs(grouped)
    setLoading(false)
  }

  async function triggerSync(sourceId: string): Promise<boolean> {
    setTriggering(prev => new Set(prev).add(sourceId))
    try {
      // 90-second timeout per sync — Vercel functions cap at 60-300s depending on plan
      const res = await fetch(`/api/sync/${sourceId}`, {
        method: 'POST',
        signal: AbortSignal.timeout(90_000),
      })
      if (res.ok) {
        toast.success(`${sourceId} — done`)
        return true
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(`${sourceId}: ${data.error ?? 'failed'}`)
        return false
      }
    } catch (e) {
      const msg = e instanceof Error && e.name === 'TimeoutError' ? 'timed out (>90s)' : 'network error'
      toast.error(`${sourceId}: ${msg}`)
      return false
    } finally {
      setTriggering(prev => { const n = new Set(prev); n.delete(sourceId); return n })
    }
  }

  async function runAll() {
    setRunningAll(true)
    toast.info(`Firing all ${SYNC_SOURCES.length} syncs in parallel…`)

    // Run in parallel — all fire at once, each has its own 90s timeout
    const results = await Promise.allSettled(
      SYNC_SOURCES.map(s => triggerSync(s.id))
    )

    const succeeded = results.filter(r => r.status === 'fulfilled' && r.value).length
    await loadLogs()
    toast.success(`All syncs done — ${succeeded}/${SYNC_SOURCES.length} succeeded`)
    setRunningAll(false)
  }

  function getLatest(sourceId: string) {
    return syncLogs[sourceId]?.[0] ?? null
  }

  const neverRun = SYNC_SOURCES.filter(s => !getLatest(s.id)).length
  const succeeded = SYNC_SOURCES.filter(s => getLatest(s.id)?.status === 'success').length
  const errored = SYNC_SOURCES.filter(s => getLatest(s.id)?.status === 'error').length
  const totalAdded = Object.values(syncLogs).flat().reduce((sum, l) => sum + (l.records_added ?? 0), 0)

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Sync</h1>
          <p className="text-sm text-gray-500 mt-0.5">{SYNC_SOURCES.length} sources · {totalAdded.toLocaleString()} total records ingested</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadLogs} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            className="bg-teal-600 hover:bg-teal-700 text-white"
            onClick={runAll}
            disabled={runningAll}
          >
            {runningAll ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Zap className="h-4 w-4 mr-1.5" />}
            Run All Now
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Never run', count: neverRun, color: 'bg-gray-50 border-gray-200 text-gray-600' },
          { label: 'Succeeded', count: succeeded, color: 'bg-teal-50 border-teal-200 text-teal-700' },
          { label: 'Errors', count: errored, color: 'bg-red-50 border-red-200 text-red-700' },
          { label: 'Records total', count: totalAdded.toLocaleString(), color: 'bg-blue-50 border-blue-200 text-blue-700' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-4 ${s.color}`}>
            <div className="text-2xl font-bold">{s.count}</div>
            <div className="text-xs">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {SYNC_SOURCES.map(source => {
          const latest = getLatest(source.id)
          const logs = syncLogs[source.id] ?? []
          const isTriggering = triggering.has(source.id)

          return (
            <Card key={source.id} className="border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Status dot */}
                    {!latest && <Clock className="h-4 w-4 text-gray-300 flex-shrink-0" />}
                    {latest?.status === 'success' && <CheckCircle2 className="h-4 w-4 text-teal-500 flex-shrink-0" />}
                    {latest?.status === 'error' && <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />}
                    {latest?.status === 'running' && <Loader2 className="h-4 w-4 text-blue-500 animate-spin flex-shrink-0" />}
                    {latest?.status === 'partial' && <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />}

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900 text-sm">{source.label}</p>
                        <span className="text-xs text-gray-400 hidden sm:inline">{source.schedule}</span>
                      </div>
                      <p className="text-xs text-gray-400 truncate">{source.description}</p>

                      {latest ? (
                        <div className="flex items-center gap-3 mt-1 text-xs">
                          <span className="text-gray-400">{formatDate(latest.started_at)}</span>
                          {(latest.records_added ?? 0) > 0 && (
                            <span className="text-teal-600 font-medium">+{latest.records_added?.toLocaleString()} added</span>
                          )}
                          {(latest.records_skipped ?? 0) > 0 && (
                            <span className="text-gray-400">{latest.records_skipped?.toLocaleString()} skipped</span>
                          )}
                          {latest.status === 'error' && latest.error_message && (
                            <span className="text-red-500 truncate max-w-xs">{latest.error_message}</span>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 mt-0.5">Never run</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* History dots */}
                    {logs.length > 1 && (
                      <div className="flex gap-1">
                        {logs.slice(0, 5).map(log => (
                          <div key={log.id} title={`${formatDate(log.started_at)}: ${log.status}`}
                            className={`h-2 w-2 rounded-full ${
                              log.status === 'success' ? 'bg-teal-400' :
                              log.status === 'error' ? 'bg-red-400' :
                              log.status === 'running' ? 'bg-blue-400' : 'bg-amber-400'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                    <Button size="sm" variant="outline" onClick={() => triggerSync(source.id)}
                      disabled={isTriggering || latest?.status === 'running' || runningAll}
                      className="text-xs px-3"
                    >
                      {isTriggering
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <><Play className="h-3 w-3 mr-1" />Run</>
                      }
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
