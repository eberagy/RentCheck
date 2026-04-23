-- 2026-04-23 — Opt-in public renter profile at /u/[userId]
-- Additive. Default off — no one's review history becomes public without
-- explicit opt-in from the settings page.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS public_profile BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.public_profile IS
  'If true, /u/[userId] renders a public profile page showing approved reviews. Opt-in only.';
