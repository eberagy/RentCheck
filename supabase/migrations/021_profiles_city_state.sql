-- ============================================================
-- Migration 021: Add city and state columns to profiles
-- Used by onboarding flow to store user's selected city
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS city       TEXT,
  ADD COLUMN IF NOT EXISTS state      TEXT;
