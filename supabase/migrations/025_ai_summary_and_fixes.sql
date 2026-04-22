-- Migration 025: Add ai_summary columns to landlords and admin_notes to landlord_submissions
-- These columns are referenced in code/types but were missing from individual migrations.

ALTER TABLE public.landlords
  ADD COLUMN IF NOT EXISTS ai_summary TEXT,
  ADD COLUMN IF NOT EXISTS ai_summary_updated_at TIMESTAMPTZ;

ALTER TABLE public.landlord_submissions
  ADD COLUMN IF NOT EXISTS admin_notes TEXT;
