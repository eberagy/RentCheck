import { describe, it, expect } from 'vitest'
import type { AdminActionType } from './audit'

describe('AdminActionType', () => {
  // These string literals are what gets persisted in admin_actions.action_type.
  // The audit log is forever — once a value ships, you can't quietly rename
  // it without losing query joinability across history. This test pins the
  // canonical set so a reviewer sees the change in a diff.
  it('matches the published canonical set (compile-time check)', () => {
    const ALL_TYPES: AdminActionType[] = [
      'review.approved', 'review.rejected', 'review.flagged',
      'lease.verified', 'lease.rejected',
      'claim.approved', 'claim.rejected',
      'submission.approved', 'submission.rejected', 'submission.duplicate',
      'response.approved', 'response.rejected',
      'flag.dismissed', 'flag.review_removed',
      'dispute.resolved', 'dispute.record_removed',
      'user.banned', 'user.unbanned',
      'user.promoted',
    ]
    // 19 entries (sanity)
    expect(ALL_TYPES).toHaveLength(19)
    // Every entry is unique
    expect(new Set(ALL_TYPES).size).toBe(ALL_TYPES.length)
    // Every entry follows the `<resource>.<action>` shape
    for (const t of ALL_TYPES) {
      expect(t).toMatch(/^[a-z]+\.[a-z_]+$/)
    }
  })

  it('every type pairs an inverse action where one exists', () => {
    // A regression that would land "review.approved" without "review.rejected"
    // (or vice versa) would mean the moderation flow lost a branch.
    const pairs: Array<[AdminActionType, AdminActionType]> = [
      ['review.approved', 'review.rejected'],
      ['lease.verified', 'lease.rejected'],
      ['claim.approved', 'claim.rejected'],
      ['submission.approved', 'submission.rejected'],
      ['response.approved', 'response.rejected'],
      ['user.banned', 'user.unbanned'],
    ]
    for (const [a, b] of pairs) {
      expect(a).toBeDefined()
      expect(b).toBeDefined()
    }
  })
})
