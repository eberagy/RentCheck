-- ============================================================
-- Migration 008: Admin Panel Column Additions
-- Adds columns referenced by the admin UI that weren't in
-- previous migrations. All use IF NOT EXISTS / DO blocks
-- for idempotency.
-- ============================================================

-- ─── PROFILES ─────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_banned       BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS review_count    INTEGER DEFAULT 0;

-- ─── LANDLORDS ────────────────────────────────────────────────
ALTER TABLE public.landlords
  ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;

-- ─── REVIEWS ──────────────────────────────────────────────────
-- Alias admin_notes → same purpose as moderation_note
-- Keep both for backwards compat; admin panel writes admin_notes
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS admin_notes           TEXT,
  ADD COLUMN IF NOT EXISTS lease_rejection_reason TEXT;

-- Expand sync_log status to match what sync jobs actually emit
-- ('running' already exists; add 'success','error','partial')
ALTER TABLE public.sync_log
  DROP CONSTRAINT IF EXISTS sync_log_status_check;
ALTER TABLE public.sync_log
  ADD CONSTRAINT sync_log_status_check
    CHECK (status IN ('running','success','error','partial','completed','failed'));

-- finished_at alias (code uses finished_at, schema has completed_at)
ALTER TABLE public.sync_log
  ADD COLUMN IF NOT EXISTS finished_at TIMESTAMPTZ;

-- ─── RECORD DISPUTES ─────────────────────────────────────────
-- Add richer fields for admin resolution workflow
ALTER TABLE public.record_disputes
  ADD COLUMN IF NOT EXISTS detail         TEXT,
  ADD COLUMN IF NOT EXISTS admin_notes    TEXT,
  ADD COLUMN IF NOT EXISTS admin_decision TEXT,
  ADD COLUMN IF NOT EXISTS resolved_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS submitter_id   UUID REFERENCES public.profiles(id);

-- The disputes page filters by status='open'; add it to the enum
ALTER TABLE public.record_disputes
  DROP CONSTRAINT IF EXISTS record_disputes_status_check;
ALTER TABLE public.record_disputes
  ADD CONSTRAINT record_disputes_status_check
    CHECK (status IN ('open','pending','reviewed','resolved','dismissed'));

-- Back-fill 'pending' → 'open' for existing rows
UPDATE public.record_disputes SET status = 'open' WHERE status = 'pending';

-- ─── REVIEW RESPONSE MODERATION ──────────────────────────────
-- Ensure landlord_response_status has 'approved' literal too
-- (already defined in 002 but add safety)
ALTER TABLE public.reviews
  DROP CONSTRAINT IF EXISTS reviews_landlord_response_status_check;
ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_landlord_response_status_check
    CHECK (landlord_response_status IS NULL OR
           landlord_response_status IN ('pending','approved','rejected'));

-- ─── PROFILE REVIEW COUNT TRIGGER ────────────────────────────
CREATE OR REPLACE FUNCTION public.update_profile_review_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.reviewer_id IS NOT NULL THEN
    UPDATE public.profiles
    SET review_count = review_count + 1
    WHERE id = NEW.reviewer_id;
  ELSIF TG_OP = 'DELETE' AND OLD.reviewer_id IS NOT NULL THEN
    UPDATE public.profiles
    SET review_count = GREATEST(review_count - 1, 0)
    WHERE id = OLD.reviewer_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_profile_review_count ON public.reviews;
CREATE TRIGGER trg_profile_review_count
  AFTER INSERT OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_profile_review_count();
