-- ============================================================
-- Migration 005: Row Level Security Policies
-- CRITICAL: Enable RLS on every table. Never disable in production.
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landlords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unlinked_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_helpful ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.record_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landlord_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screening_requests ENABLE ROW LEVEL SECURITY;

-- ─── HELPER: is_admin() ───────────────────────────────────────
-- Avoids recursive policy on profiles table
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND user_type = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ─── PROFILES ────────────────────────────────────────────────
CREATE POLICY "profiles_self" ON public.profiles
  FOR ALL USING (auth.uid() = id);
CREATE POLICY "profiles_admin_all" ON public.profiles
  FOR ALL USING (public.is_admin());
-- Public: allow reading name/avatar for review attribution
CREATE POLICY "profiles_public_read" ON public.profiles
  FOR SELECT USING (true);

-- ─── LANDLORDS ───────────────────────────────────────────────
CREATE POLICY "landlords_public_read" ON public.landlords
  FOR SELECT USING (true);
CREATE POLICY "landlords_claimant_update" ON public.landlords
  FOR UPDATE USING (claimed_by = auth.uid() OR public.is_admin());
CREATE POLICY "landlords_admin_insert" ON public.landlords
  FOR INSERT WITH CHECK (public.is_admin() OR auth.uid() IS NOT NULL);

-- ─── PROPERTIES ──────────────────────────────────────────────
CREATE POLICY "properties_public_read" ON public.properties
  FOR SELECT USING (true);
CREATE POLICY "properties_admin_write" ON public.properties
  FOR ALL USING (public.is_admin());
CREATE POLICY "properties_auth_insert" ON public.properties
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ─── REVIEWS ─────────────────────────────────────────────────
-- Approved reviews public; own pending reviews visible; admin sees all
CREATE POLICY "reviews_public_approved" ON public.reviews
  FOR SELECT USING (
    status = 'approved'
    OR reviewer_id = auth.uid()
    OR public.is_admin()
  );
CREATE POLICY "reviews_authenticated_insert" ON public.reviews
  FOR INSERT WITH CHECK (
    auth.uid() = reviewer_id
    AND reviewer_id IS NOT NULL
  );
CREATE POLICY "reviews_own_pending_update" ON public.reviews
  FOR UPDATE USING (
    (reviewer_id = auth.uid() AND status = 'pending')
    OR public.is_admin()
  );
CREATE POLICY "reviews_admin_delete" ON public.reviews
  FOR DELETE USING (public.is_admin());

-- ─── REVIEW EVIDENCE ─────────────────────────────────────────
CREATE POLICY "evidence_owner_or_admin" ON public.review_evidence
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.reviews r WHERE r.id = review_id AND r.reviewer_id = auth.uid())
    OR public.is_admin()
  );
CREATE POLICY "evidence_reviewer_insert" ON public.review_evidence
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.reviews r WHERE r.id = review_id AND r.reviewer_id = auth.uid())
  );

-- ─── PUBLIC RECORDS ──────────────────────────────────────────
CREATE POLICY "records_public_read" ON public.public_records
  FOR SELECT USING (true);
CREATE POLICY "records_admin_write" ON public.public_records
  FOR ALL USING (public.is_admin());
-- Service role (sync jobs) bypasses RLS automatically

-- ─── UNLINKED RECORDS ────────────────────────────────────────
CREATE POLICY "unlinked_admin_only" ON public.unlinked_records
  FOR ALL USING (public.is_admin());

-- ─── REVIEW FLAGS ────────────────────────────────────────────
CREATE POLICY "flags_auth_insert" ON public.review_flags
  FOR INSERT WITH CHECK (auth.uid() = flagged_by AND auth.uid() IS NOT NULL);
CREATE POLICY "flags_admin_read" ON public.review_flags
  FOR SELECT USING (public.is_admin() OR flagged_by = auth.uid());

-- ─── HELPFUL VOTES ───────────────────────────────────────────
CREATE POLICY "helpful_public_read" ON public.review_helpful
  FOR SELECT USING (true);
CREATE POLICY "helpful_auth_insert" ON public.review_helpful
  FOR INSERT WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);
CREATE POLICY "helpful_own_delete" ON public.review_helpful
  FOR DELETE USING (auth.uid() = user_id);

-- ─── RECORD DISPUTES ─────────────────────────────────────────
CREATE POLICY "disputes_auth_insert" ON public.record_disputes
  FOR INSERT WITH CHECK (auth.uid() = disputed_by AND auth.uid() IS NOT NULL);
CREATE POLICY "disputes_own_or_admin" ON public.record_disputes
  FOR SELECT USING (disputed_by = auth.uid() OR public.is_admin());
CREATE POLICY "disputes_admin_update" ON public.record_disputes
  FOR UPDATE USING (public.is_admin());

-- ─── LANDLORD CLAIMS ─────────────────────────────────────────
CREATE POLICY "claims_auth_insert" ON public.landlord_claims
  FOR INSERT WITH CHECK (auth.uid() = claimed_by AND auth.uid() IS NOT NULL);
CREATE POLICY "claims_own_or_admin" ON public.landlord_claims
  FOR SELECT USING (claimed_by = auth.uid() OR public.is_admin());
CREATE POLICY "claims_admin_update" ON public.landlord_claims
  FOR UPDATE USING (public.is_admin());

-- ─── WATCHLIST ───────────────────────────────────────────────
CREATE POLICY "watchlist_own" ON public.watchlist
  FOR ALL USING (auth.uid() = user_id);

-- ─── SYNC LOG ────────────────────────────────────────────────
CREATE POLICY "sync_log_admin" ON public.sync_log
  FOR ALL USING (public.is_admin());

-- ─── STORAGE POLICIES ────────────────────────────────────────
-- Lease docs: owner read only (stored as {user_id}/{uuid}.pdf)
CREATE POLICY "lease_owner_only" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'lease-docs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "lease_owner_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'lease-docs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "lease_admin_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'lease-docs' AND public.is_admin());

-- Evidence photos: owner + admin
CREATE POLICY "evidence_owner_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'evidence-photos'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.is_admin()
    )
  );
CREATE POLICY "evidence_owner_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'evidence-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Landlord verification docs: admin only
CREATE POLICY "verification_admin" ON storage.objects
  FOR ALL USING (
    bucket_id = 'landlord-verification-docs'
    AND public.is_admin()
  );
CREATE POLICY "verification_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'landlord-verification-docs'
    AND (
      public.is_admin()
      OR auth.uid()::text = (storage.foldername(name))[1]
    )
  );

-- Avatars: public read
CREATE POLICY "avatars_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "avatars_owner_write" ON storage.objects
  FOR ALL USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
