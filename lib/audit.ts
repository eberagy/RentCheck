import { createServiceClient } from '@/lib/supabase/service'
import { captureException } from '@/lib/sentry'

export type AdminActionType =
  | 'review.approved'     | 'review.rejected'     | 'review.flagged'
  | 'lease.verified'      | 'lease.rejected'
  | 'claim.approved'      | 'claim.rejected'
  | 'submission.approved' | 'submission.rejected' | 'submission.duplicate'
  | 'response.approved'   | 'response.rejected'
  | 'flag.dismissed'      | 'flag.review_removed'
  | 'dispute.resolved'    | 'dispute.record_removed'
  | 'user.banned'         | 'user.unbanned'
  | 'user.promoted'       | 'user.note_updated'

export interface LogAdminActionArgs {
  adminId: string
  actionType: AdminActionType
  resourceType?: string
  resourceId?: string
  subjectUserId?: string
  detail?: Record<string, unknown>
}

/**
 * Append-only audit log of admin actions. Fire-and-forget; never throws.
 * If the `admin_actions` table isn't deployed yet, this silently swallows the
 * error so admin endpoints still work.
 */
export function logAdminAction(args: LogAdminActionArgs): void {
  void (async () => {
    try {
      const service = createServiceClient()
      const { error } = await service.from('admin_actions').insert({
        admin_id: args.adminId,
        action_type: args.actionType,
        resource_type: args.resourceType ?? null,
        resource_id: args.resourceId ?? null,
        subject_user_id: args.subjectUserId ?? null,
        detail: args.detail ?? null,
      })
      // Supabase returns errors in the response object rather than throwing,
      // so check both. Silent audit-log failures destroy the compliance
      // record with no observability — route to Sentry so the team finds
      // out before an incident asks "what did the admin do?"
      if (error) {
        console.error('[audit] logAdminAction insert failed:', error)
        captureException(error, {
          where: 'audit/logAdminAction:insert',
          actionType: args.actionType,
        })
      }
    } catch (err) {
      console.error('[audit] logAdminAction failed:', err)
      captureException(err, {
        where: 'audit/logAdminAction',
        actionType: args.actionType,
      })
    }
  })()
}
