-- ============================================================
-- Migration 013: Add proof_doc_url to landlord_submissions
-- ============================================================

ALTER TABLE public.landlord_submissions
  ADD COLUMN IF NOT EXISTS proof_doc_url TEXT;
