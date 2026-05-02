import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'
import { ScrollText } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Admin Audit Log',
  robots: { index: false, follow: false },
}

const ACTION_LABELS: Record<string, string> = {
  'review.approved':        'Approved review',
  'review.rejected':        'Rejected review',
  'review.flagged':         'Flagged review',
  'lease.verified':         'Verified lease',
  'lease.rejected':         'Rejected lease',
  'claim.approved':         'Approved landlord claim',
  'claim.rejected':         'Rejected landlord claim',
  'submission.approved':    'Approved landlord submission',
  'submission.rejected':    'Rejected landlord submission',
  'submission.duplicate':   'Marked submission as duplicate',
  'response.approved':      'Approved landlord response',
  'response.rejected':      'Rejected landlord response',
  'flag.dismissed':         'Dismissed review flag',
  'flag.review_removed':    'Removed review via flag',
  'dispute.resolved':       'Resolved record dispute',
  'dispute.record_removed': 'Removed disputed record',
  'user.banned':            'Banned user',
  'user.unbanned':          'Unbanned user',
  'user.promoted':          'Changed user role',
}

const TONE: Record<string, string> = {
  'review.approved':        'bg-teal-50 text-teal-700 border-teal-200',
  'review.rejected':        'bg-red-50 text-red-700 border-red-200',
  'review.flagged':         'bg-orange-50 text-orange-700 border-orange-200',
  'lease.verified':         'bg-teal-50 text-teal-700 border-teal-200',
  'lease.rejected':         'bg-red-50 text-red-700 border-red-200',
  'claim.approved':         'bg-teal-50 text-teal-700 border-teal-200',
  'claim.rejected':         'bg-red-50 text-red-700 border-red-200',
  'submission.approved':    'bg-teal-50 text-teal-700 border-teal-200',
  'submission.rejected':    'bg-red-50 text-red-700 border-red-200',
  'submission.duplicate':   'bg-amber-50 text-amber-700 border-amber-200',
  'response.approved':      'bg-teal-50 text-teal-700 border-teal-200',
  'response.rejected':      'bg-red-50 text-red-700 border-red-200',
  'flag.dismissed':         'bg-slate-50 text-slate-700 border-slate-200',
  'flag.review_removed':    'bg-red-50 text-red-700 border-red-200',
  'dispute.resolved':       'bg-slate-50 text-slate-700 border-slate-200',
  'dispute.record_removed': 'bg-red-50 text-red-700 border-red-200',
  'user.banned':            'bg-red-50 text-red-700 border-red-200',
  'user.unbanned':          'bg-teal-50 text-teal-700 border-teal-200',
  'user.promoted':          'bg-purple-50 text-purple-700 border-purple-200',
}

interface AuditRow {
  id: string
  action_type: string
  resource_type: string | null
  resource_id: string | null
  subject_user_id: string | null
  detail: Record<string, unknown> | null
  created_at: string
  admin: { full_name: string | null; email: string | null } | null
  subject: { full_name: string | null; email: string | null } | null
}

export default async function AdminAuditPage({ searchParams }: { searchParams: Promise<{ limit?: string }> }) {
  const params = await searchParams
  const limit = Math.min(parseInt(params.limit ?? '100'), 500)
  const service = createServiceClient()

  const { data: actions, error } = await service
    .from('admin_actions')
    .select(`
      id, action_type, resource_type, resource_id, subject_user_id, detail, created_at,
      admin:profiles!admin_actions_admin_id_fkey(full_name, email),
      subject:profiles!admin_actions_subject_user_id_fkey(full_name, email)
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  const tableMissing = !!error && /does not exist|relation .* does not exist|admin_actions/.test(error.message)
  const rows = (actions ?? []) as unknown as AuditRow[]

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
          <ScrollText className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit log</h1>
          <p className="text-sm text-gray-500 mt-0.5">Every admin action — who, what, when. Last {limit} events shown.</p>
        </div>
      </div>

      {tableMissing && (
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">admin_actions table not deployed yet.</p>
          <p className="mt-1">Run <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono">supabase/migrations/100_admin_actions_log.sql</code> to enable the audit trail. Until then, admin routes still work but new actions aren&apos;t logged.</p>
        </div>
      )}

      {rows.length === 0 && !tableMissing ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm text-slate-500">
          No admin actions logged yet.
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                <th className="px-4 py-2.5">When</th>
                <th className="px-4 py-2.5">Admin</th>
                <th className="px-4 py-2.5">Action</th>
                <th className="px-4 py-2.5">Subject</th>
                <th className="px-4 py-2.5">Detail</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-b border-slate-100 last:border-b-0 align-top">
                  <td className="px-4 py-3 text-[12.5px] text-slate-500 whitespace-nowrap">
                    {formatDate(r.created_at)}
                  </td>
                  <td className="px-4 py-3 text-[13px]">
                    <div className="font-medium text-slate-900">{r.admin?.full_name ?? 'Unknown'}</div>
                    <div className="text-[11.5px] text-slate-400">{r.admin?.email ?? ''}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11.5px] font-medium ${TONE[r.action_type] ?? 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                      {ACTION_LABELS[r.action_type] ?? r.action_type}
                    </span>
                    {r.resource_type && r.resource_id && (
                      <div className="mt-1 font-mono text-[10.5px] text-slate-400">{r.resource_type}:{r.resource_id.slice(0, 8)}…</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[13px]">
                    {r.subject ? (
                      <>
                        <div className="font-medium text-slate-900">{r.subject.full_name ?? 'Unknown'}</div>
                        <div className="text-[11.5px] text-slate-400">{r.subject.email ?? ''}</div>
                      </>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[12.5px] text-slate-600">
                    {r.detail ? (
                      <code className="rounded bg-slate-50 px-2 py-1 font-mono text-[11.5px] text-slate-700">
                        {JSON.stringify(r.detail)}
                      </code>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
