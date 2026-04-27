// PUBLIC_REVIEW_SELECT — the safe column list for approved reviews rendered publicly.
// Do NOT add lease_doc_path, admin_notes, lease_rejection_reason, moderated_by,
// lease_verified_by, reviewer_id, reviewer email, or any admin/PII field here.
// The reviewer email used to be included here — it was leaking via GET /api/reviews.
export const PUBLIC_REVIEW_SELECT = `
  id,
  landlord_id,
  property_id,
  rating_overall,
  rating_responsiveness,
  rating_maintenance,
  rating_honesty,
  rating_lease_fairness,
  would_rent_again,
  title,
  body,
  rental_period_start,
  rental_period_end,
  is_current_tenant,
  property_address,
  lease_verified,
  landlord_response,
  landlord_response_at,
  landlord_response_status,
  helpful_count,
  flag_count,
  is_anonymous,
  created_at,
  updated_at,
  reviewer:profiles!reviews_reviewer_id_fkey(full_name, avatar_url),
  property:properties(address_line1, city, state_abbr)
`

// Client-facing review shape after stripping admin/pending-response fields.
// Use stripPrivateReviewFields() before returning to any public client.
export type PublicReview = {
  id: string
  landlord_id: string
  property_id: string | null
  rating_overall: number
  rating_responsiveness: number | null
  rating_maintenance: number | null
  rating_honesty: number | null
  rating_lease_fairness: number | null
  would_rent_again: boolean | null
  title: string
  body: string
  rental_period_start: string | null
  rental_period_end: string | null
  is_current_tenant: boolean
  property_address: string | null
  lease_verified: boolean
  landlord_response: string | null
  landlord_response_at: string | null
  landlord_response_status: 'pending' | 'approved' | 'rejected' | null
  helpful_count: number
  flag_count: number
  is_anonymous: boolean
  created_at: string
  updated_at: string | null
  reviewer: { full_name: string | null; avatar_url: string | null } | null
  property: { address_line1: string | null; city: string | null; state_abbr: string | null } | null
}

// Landlord responses must only be visible to the public when their moderation
// status is 'approved'. Anywhere else (including /api/reviews and /landlord/*)
// we strip the body so pending/rejected drafts never leak.
export function stripPrivateReviewFields<T extends { landlord_response?: string | null; landlord_response_status?: string | null }>(review: T): T {
  if (review.landlord_response_status !== 'approved') {
    return { ...review, landlord_response: null, landlord_response_at: null }
  }
  return review
}
