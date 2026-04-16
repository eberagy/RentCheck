'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, CheckCircle2, XCircle, Clock, Play, Loader2, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  { id: 'nyc-hpd', label: 'NYC HPD Violations', schedule: 'Daily 3am', description: 'NYC Housing Preservation & Development housing violations' },
  { id: 'nyc-dob', label: 'NYC DOB Complaints', schedule: 'Daily 3:30am', description: 'NYC Dept of Buildings complaints and violations' },
  { id: 'nyc-registration', label: 'NYC Rent Registration', schedule: 'Daily 4am', description: 'NYC rent stabilization/registration data' },
  { id: 'chicago', label: 'Chicago Violations', schedule: 'Daily 4am', description: 'Chicago Dept of Buildings violations (Socrata)' },
  { id: 'sf', label: 'San Francisco', schedule: 'Daily 4am', description: 'SF Housing violations (DataSF)' },
  { id: 'boston', label: 'Boston Inspections', schedule: 'Daily 4:30am', description: 'Boston Inspectional Services violations' },
  { id: 'philadelphia', label: 'Philadelphia L&I', schedule: 'Daily 4:30am', description: 'Philadelphia Licenses & Inspections violations' },
  { id: 'baltimore', label: 'Baltimore Vacant Notices', schedule: 'Daily 5am', description: 'Baltimore open vacant-building notices' },
  { id: 'pittsburgh', label: 'Pittsburgh PLI', schedule: 'Daily 5am', description: 'Pittsburgh PLI/DOMI/ES property violations' },
  { id: 'austin', label: 'Austin Complaints', schedule: 'Daily 5am', description: 'Austin Code complaints (Open Austin)' },
  { id: 'seattle', label: 'Seattle Violations', schedule: 'Daily 5am', description: 'Seattle rental housing code violations' },
  { id: 'los-angeles', label: 'Los Angeles LAHD', schedule: 'Daily 5am', description: 'LA Housing Dept code violations' },
  { id: 'court-listener', label: 'CourtListener Cases', schedule: 'Weekly Monday 2am', description: 'Federal court cases via CourtListener API v4' },
  { id: 'lsc-evictions', label: 'LSC Eviction Data', schedule: 'Monthly 1st', description: 'Legal Services Corp bulk eviction records CSV' },
]

export default function AdminDataSyncPage() {
  const [syncLogs, setSyncLogs] = useState<Record<string, SyncJob[]>>({})
  const [loading, setLoading] = useState(true)
  const [triggering, setTriggering] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => { loadLogs() }, []) // eslint-disable-line

  async function loadLogs() {
    setLoading(true)
    const { data } = await supabase
      .from('sync_log')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(120)

    const grouped: Record<string, SyncJob[]> = {}
    for (const log of (data ?? []) as SyncJob[]) {
      if (!grouped[log.source]) grouped[log.source] = []
      if ((grouped[log.source]?.length ?? 0) < 5) grouped[log.source]!.push(log)
    }
    setSyncLogs(grouped)
    setLoading(false)
  }

  async function triggerSync(sourceId: string) {
    setTriggering(sourceId)
    try {
      const res = await fetch(`/api/sync/${sourceId}`, { method: 'POST', headers: { 'x-cron-secret': '' } })
      if (res.ok) {
        toast.success(`${sourceId} sync triggered — check logs in a moment`)
        setTimeout(() => loadLogs(), 3000)
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error ?? 'Sync failed to start')
      }
    } catch {
      toast.error('Could not reach sync endpoint')
    } finally {
      setTriggering(null)
    }
  }

  function getLatestStatus(sourceId: string) {
    const logs = syncLogs[sourceId]
    if (!logs || logs.length === 0) return null
    return logs[0]
  }

  function StatusIcon({ status }: { status: string | null | undefined }) {
    if (!status) return <Clock className="h-4 w-4 text-gray-400" />
    if (status === 'success') return <CheckCircle2 className="h-4 w-4 text-teal-500" />
    if (status === 'error') return <XCircle className="h-4 w-4 text-red-500" />
    if (status === 'running') return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
    return <AlertTriangle className="h-4 w-4 text-amber-500" />
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Sync</h1>
          <p className="text-sm text-gray-500 mt-0.5">Monitor and manually trigger public records ingestion jobs</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadLogs} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {['success', 'error', 'running', 'never'].map(s => {
          const count = SYNC_SOURCES.filter(src => {
            const latest = getLatestStatus(src.id)
            if (s === 'never') return !latest
            return latest?.status === s
          }).length
          const colors: Record<string, string> = {
            success: 'bg-teal-50 border-teal-200 text-teal-700',
            error: 'bg-red-50 border-red-200 text-red-700',
            running: 'bg-blue-50 border-blue-200 text-blue-700',
            never: 'bg-gray-50 border-gray-200 text-gray-600',
          }
          return (
            <div key={s} className={`rounded-xl border p-4 ${colors[s]}`}>
              <div className="text-2xl font-bold">{count}</div>
              <div className="text-sm capitalize">{s === 'never' ? 'Never run' : s}</div>
            </div>
          )
        })}
      </div>

      <div className="space-y-3">
        {SYNC_SOURCES.map(source => {
          const latest = getLatestStatus(source.id)
          const logs = syncLogs[source.id] ?? []

          return (
            <Card key={source.id} className="border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <StatusIcon status={latest?.status} />
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{source.label}</p>
                      <p className="text-xs text-gray-500">{source.description}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Schedule: {source.schedule}</p>

                      {latest ? (
                        <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                          <span>Last run: {formatDate(latest.started_at)}</span>
                          {latest.records_added !== null && <span className="text-teal-600">+{latest.records_added} added</span>}
                          {latest.records_updated !== null && <span>~{latest.records_updated} updated</span>}
                          {latest.records_skipped !== null && <span className="text-gray-400">{latest.records_skipped} skipped</span>}
                          {latest.status === 'error' && latest.error_message && (
                            <span className="text-red-600 truncate max-w-xs">{latest.error_message}</span>
                          )}
                        </div>
                      ) : (
                        <p className="mt-1 text-xs text-gray-400">Never run</p>
                      )}

                      {logs.length > 1 && (
                        <div className="mt-2 flex gap-1">
                          {logs.slice(0, 5).map(log => (
                            <div
                              key={log.id}
                              title={`${formatDate(log.started_at)} — ${log.status}`}
                              className={`h-2 w-2 rounded-full ${
                                log.status === 'success' ? 'bg-teal-400' :
                                log.status === 'error' ? 'bg-red-400' :
                                log.status === 'running' ? 'bg-blue-400' :
                                'bg-amber-400'
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => triggerSync(source.id)}
                    disabled={triggering === source.id || latest?.status === 'running'}
                  >
                    {triggering === source.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                    ) : (
                      <Play className="h-3.5 w-3.5 mr-1" />
                    )}
                    Run Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
