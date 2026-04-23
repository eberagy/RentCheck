import { createServiceClient } from '@/lib/supabase/server'

export type AdminActionType =
  | 'review.approved'     | 'review.rejected'     | 'review.flagged'
  | 'lease.verified'      | 'lease.rejected'
  | 'claim.approved'      | 'claim.rejected'
  | 'submission.approved' | 'submission.rejected' | 'submission.duplicate'
  | 'response.approved'   | 'response.rejected'
  | 'flag.dismissed'      | 'flag.review_removed'
  | 'dispute.resolved'    | 'dispute.record_removed'
  | 'user.banned'         | 'user.unbanned'
  | 'user.promoted'

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
      await service.from('admin_actions').insert({
        admin_id: args.adminId,
        action_type: args.actionType,
        resource_type: args.resourceType ?? null,
        resource_id: args.resourceId ?? null,
        subject_user_id: args.subjectUserId ?? null,
        detail: args.detail ?? null,
      })
    } catch (err) {
      console.error('[audit] logAdminAction failed:', err)
    }
  })()
}
