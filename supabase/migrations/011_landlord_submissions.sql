-- ============================================================
-- Migration 011: Landlord submissions (community-contributed)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.landlord_submissions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  display_name  TEXT NOT NULL,
  business_name TEXT,
  city          TEXT,
  state_abbr    CHAR(2),
  zip           TEXT,
  website       TEXT,
  phone         TEXT,
  notes         TEXT,               -- extra context from submitter
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'rejected', 'duplicate')),
  admin_notes   TEXT,
  reviewed_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for admin queue
CREATE INDEX IF NOT EXISTS idx_landlord_submissions_status ON public.landlord_submissions(status, created_at);

-- RLS
ALTER TABLE public.landlord_submissions ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can submit
CREATE POLICY "authenticated can insert submissions"
  ON public.landlord_submissions FOR INSERT
  TO authenticated
  WITH CHECK (submitted_by = auth.uid());

-- Users can see their own submissions
CREATE POLICY "users can view own submissions"
  ON public.landlord_submissions FOR SELECT
  TO authenticated
  USING (submitted_by = auth.uid());

-- Admins have full access
CREATE POLICY "admins full access submissions"
  ON public.landlord_submissions FOR ALL
  TO authenticated
  USING (public.is_admin());
