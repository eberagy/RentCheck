import { describe, it, expect } from 'vitest'
import { stripPrivateReviewFields, PUBLIC_REVIEW_SELECT } from './public'

describe('stripPrivateReviewFields', () => {
  it('strips landlord_response when status is pending', () => {
    const r = stripPrivateReviewFields({
      landlord_response: 'draft response',
      landlord_response_status: 'pending',
      landlord_response_at: '2026-01-01',
    })
    expect(r.landlord_response).toBeNull()
    expect(r.landlord_response_at).toBeNull()
  })

  it('strips landlord_response when status is rejected', () => {
    const r = stripPrivateReviewFields({
      landlord_response: 'rejected text',
      landlord_response_status: 'rejected',
      landlord_response_at: '2026-01-01',
    })
    expect(r.landlord_response).toBeNull()
    expect(r.landlord_response_at).toBeNull()
  })

  it('preserves landlord_response when status is approved', () => {
    const r = stripPrivateReviewFields({
      landlord_response: 'public response',
      landlord_response_status: 'approved',
      landlord_response_at: '2026-01-01',
    })
    expect(r.landlord_response).toBe('public response')
    expect(r.landlord_response_at).toBe('2026-01-01')
  })

  it('strips when status is null/undefined (no opt-in)', () => {
    const r1 = stripPrivateReviewFields({
      landlord_response: 'orphan response',
      landlord_response_status: null,
    })
    expect(r1.landlord_response).toBeNull()

    const r2 = stripPrivateReviewFields({
      landlord_response: 'orphan response',
    } as { landlord_response?: string | null; landlord_response_status?: string | null })
    expect(r2.landlord_response).toBeNull()
  })

  it('passes through other fields unchanged', () => {
    const r = stripPrivateReviewFields({
      id: 'abc',
      title: 'A review',
      landlord_response: 'x',
      landlord_response_status: 'pending',
    } as { id: string; title: string; landlord_response?: string | null; landlord_response_status?: string | null })
    expect(r.id).toBe('abc')
    expect(r.title).toBe('A review')
  })
})

describe('PUBLIC_REVIEW_SELECT', () => {
  it('does NOT include any private/PII fields (regression test)', () => {
    // Strip the FK-constraint reference (it legitimately contains
    // "reviewer_id_fkey") so a substring match doesn't false-positive.
    const stripped = PUBLIC_REVIEW_SELECT.replace(/!reviews_reviewer_id_fkey/g, '')
    const forbidden = [
      'lease_doc_path',
      'lease_rejection_reason',
      'admin_notes',
      'moderated_by',
      'lease_verified_by',
      'lease_filename',
      'lease_file_size',
      'reviewer_id',
      // Reviewer email used to leak via the join — keep it out
      'profiles(email',
      'profiles!(email',
    ]
    for (const term of forbidden) {
      expect(stripped).not.toContain(term)
    }
    // Verify the reviewer join only pulls full_name + avatar_url:
    expect(PUBLIC_REVIEW_SELECT).toContain('reviewer:profiles!reviews_reviewer_id_fkey(full_name, avatar_url)')
  })

  it('includes the public-safe columns', () => {
    const expected = [
      'id', 'landlord_id', 'property_id', 'rating_overall',
      'title', 'body', 'lease_verified', 'is_anonymous',
      'created_at', 'helpful_count',
    ]
    for (const col of expected) {
      expect(PUBLIC_REVIEW_SELECT).toContain(col)
    }
  })
})
