-- Security hardening from 2026-04-23 audit.
-- Deploy via Management API; idempotent.

------------------------------------------------------------------
-- 1. profiles public SELECT no longer exposes email / banning state / stripe
------------------------------------------------------------------
-- Replace the overbroad policy with a view that only returns non-sensitive columns.

DROP POLICY IF EXISTS "profiles_public_read" ON public.profiles;

-- Keep self + admin full access as before
-- (profiles_self + profiles_admin_all already exist in migration 005).

-- Create a public view that renders only non-sensitive columns.
CREATE OR REPLACE VIEW public.public_profiles AS
  SELECT id, full_name, avatar_url, bio, created_at
  FROM public.profiles
  WHERE is_banned = false;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- For existing embed queries like profiles!reviews_reviewer_id_fkey(full_name, avatar_url),
-- add a narrow SELECT policy that returns ONLY the public columns.
-- We achieve this by an additional policy that grants SELECT but only permits
-- the column set via the view. PostgREST applies column-level grants.
-- Column-level grants:
REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (id, full_name, avatar_url, bio, created_at)
  ON public.profiles TO anon;
-- Authenticated users need to be able to read additional columns of their OWN
-- row; profiles_self policy covers that. We also want authenticated clients
-- reviewing/rendering reviews to see names/avatars of other users, so grant
-- the same narrow column set to authenticated.
GRANT SELECT (id, full_name, avatar_url, bio, created_at)
  ON public.profiles TO authenticated;

-- Recreate a narrow read policy for anon+authenticated (column grants above
-- restrict WHICH columns actually come back).
CREATE POLICY "profiles_public_min" ON public.profiles
  FOR SELECT USING (true);

------------------------------------------------------------------
-- 2. reviews UPDATE WITH CHECK — prevent self-approval
------------------------------------------------------------------
-- The existing policy USING allows owner + admin to update but has no
-- WITH CHECK, meaning a reviewer could flip their own row to
-- status='approved' via a direct Supabase write. Pin status to 'pending'
-- in the NEW row.

DROP POLICY IF EXISTS "reviews_own_pending_update" ON public.reviews;

CREATE POLICY "reviews_own_pending_update" ON public.reviews
  FOR UPDATE
  USING (
    (reviewer_id = auth.uid() AND status = 'pending')
    OR public.is_admin()
  )
  WITH CHECK (
    -- Reviewer may edit their own still-pending review but cannot change status
    (reviewer_id = auth.uid() AND status = 'pending')
    -- Admins retain full-write authority
    OR public.is_admin()
  );

------------------------------------------------------------------
-- 3. Hide admin-only review columns from public SELECTs
------------------------------------------------------------------
-- Column-level grants on reviews so admin_notes, lease_doc_path,
-- lease_rejection_reason, moderated_by, lease_verified_by, reviewer_id
-- are never returned to anon/authenticated.
REVOKE SELECT ON public.reviews FROM anon, authenticated;

GRANT SELECT (
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
  status,
  landlord_response,
  landlord_response_at,
  landlord_response_status,
  helpful_count,
  flag_count,
  created_at,
  updated_at
) ON public.reviews TO anon, authenticated;

-- Admin full access still flows through the admin RLS policies + service-role key.

------------------------------------------------------------------
-- 4. landlords — strip internal claim metadata from public reads
------------------------------------------------------------------
REVOKE SELECT ON public.landlords FROM anon, authenticated;

GRANT SELECT (
  id,
  slug,
  display_name,
  business_name,
  city,
  state_abbr,
  zip,
  website,
  phone,
  bio,
  avg_rating,
  review_count,
  total_violation_count,
  open_violation_count,
  eviction_count,
  is_verified,
  is_claimed,
  created_at,
  updated_at
) ON public.landlords TO anon, authenticated;

-- claimed_by, verification_docs_url, verification_date, grade (trigger-only)
-- are NOT granted to public — admin keeps access via service role.

------------------------------------------------------------------
-- 5. landlord_claims — banned users may not insert
------------------------------------------------------------------
DROP POLICY IF EXISTS "claims_insert_own" ON public.landlord_claims;

CREATE POLICY "claims_insert_own" ON public.landlord_claims
  FOR INSERT
  WITH CHECK (
    claimed_by = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_banned = true
    )
  );
