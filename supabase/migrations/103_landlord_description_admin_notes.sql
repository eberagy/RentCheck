-- 2026-04-23 — landlord.description (public bio) + profiles.admin_notes
-- Both additive. Safe to deploy live.

-- Public "About" field on a landlord profile, editable only by the verified
-- claimant via /api/landlord-profile. Separate from landlord.bio (AI-generated
-- summary) — this is owner-authored copy.
ALTER TABLE public.landlords
  ADD COLUMN IF NOT EXISTS description TEXT CHECK (description IS NULL OR length(description) <= 1200);

-- Freeform admin-only notes on a user profile. Used for internal flagging
-- ("repeat duplicate submitter", "contacted about defamation", etc.). Never
-- surfaced publicly.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS admin_notes TEXT;

COMMENT ON COLUMN public.landlords.description IS
  'Public "About" copy authored by the verified claimant. NULL if unclaimed or unset.';
COMMENT ON COLUMN public.profiles.admin_notes IS
  'Admin-only free-form notes. Never surfaced publicly. Written via /api/admin/user-notes.';
