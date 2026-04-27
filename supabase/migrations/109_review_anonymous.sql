-- 2026-04-27 — Privacy-first review display.
-- Reviews always lease-verified, but the renter shouldn't be forced to
-- expose their name + apartment address publicly. Add an is_anonymous
-- flag that drives both: when true, the reviewer is shown as "Anonymous
-- renter" and the property address is hidden from the public review card.
-- Default true (privacy-first); reviewers explicitly opt in to showing
-- their name on the review submission flow.

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN NOT NULL DEFAULT true;

-- Existing reviews: leave is_anonymous = true so previously-shown names
-- and addresses get hidden retroactively. The user explicitly asked for
-- this to be the default for the existing review on the live site.

COMMENT ON COLUMN public.reviews.is_anonymous IS
  'When true (default), the reviewer name and property_address are hidden from the public review card. Reviewers opt in to showing their name on submission step 4.';

-- Grant the new column to anon + authenticated so review queries can read it.
-- (Required because migration 099 locked the reviews SELECT grants to an
-- explicit column list — see PUBLIC_REVIEW_SELECT in lib/reviews/public.ts.)
GRANT SELECT (is_anonymous) ON public.reviews TO anon, authenticated;
