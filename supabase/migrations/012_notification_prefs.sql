-- ============================================================
-- Migration 012: Notification preferences on profiles
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_reviews   BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_watchlist BOOLEAN NOT NULL DEFAULT true;
