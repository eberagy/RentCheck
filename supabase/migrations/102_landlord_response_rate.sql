-- 2026-04-23 — Response rate on landlord.
-- Additive column + trigger reuse. Safe to deploy live.

ALTER TABLE public.landlords
  ADD COLUMN IF NOT EXISTS response_rate NUMERIC(5, 2),
  ADD COLUMN IF NOT EXISTS responded_review_count INT NOT NULL DEFAULT 0;

-- Update the existing review-stats trigger to also recompute response_rate.
CREATE OR REPLACE FUNCTION public.update_landlord_stats()
RETURNS TRIGGER AS $$
DECLARE
  target_landlord_id UUID;
  approved_count INT;
  responded_count INT;
BEGIN
  target_landlord_id := COALESCE(NEW.landlord_id, OLD.landlord_id);

  SELECT COUNT(*) INTO approved_count
    FROM public.reviews
    WHERE landlord_id = target_landlord_id
      AND status = 'approved';

  SELECT COUNT(*) INTO responded_count
    FROM public.reviews
    WHERE landlord_id = target_landlord_id
      AND status = 'approved'
      AND landlord_response_status = 'approved';

  UPDATE public.landlords SET
    avg_rating = COALESCE((
      SELECT ROUND(AVG(rating_overall)::NUMERIC, 2)
      FROM public.reviews
      WHERE landlord_id = target_landlord_id
        AND status = 'approved'
    ), 0),
    review_count = approved_count,
    responded_review_count = responded_count,
    -- Only meaningful at >= 3 approved reviews — sample-size honesty matches
    -- the landlord-profile chip rule. Below 3 we null it so clients hide it.
    response_rate = CASE
      WHEN approved_count >= 3
        THEN ROUND((responded_count::NUMERIC / approved_count) * 100, 0)
      ELSE NULL
    END,
    updated_at = NOW()
  WHERE id = target_landlord_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger is already attached; this CREATE OR REPLACE updates the function
-- and the existing trigger picks it up automatically. No DROP/CREATE TRIGGER
-- needed (and safer — avoids race conditions while reviews are being written).

-- One-time backfill so every landlord gets accurate counts right away.
UPDATE public.landlords l SET
  responded_review_count = (
    SELECT COUNT(*) FROM public.reviews
    WHERE landlord_id = l.id
      AND status = 'approved'
      AND landlord_response_status = 'approved'
  ),
  response_rate = (
    SELECT CASE
      WHEN COUNT(*) >= 3
        THEN ROUND(
          (COUNT(*) FILTER (WHERE landlord_response_status = 'approved')::NUMERIC
            / NULLIF(COUNT(*), 0)) * 100, 0
        )
      ELSE NULL
    END
    FROM public.reviews
    WHERE landlord_id = l.id
      AND status = 'approved'
  );

-- Grant the new columns to anon + authenticated so cards + profiles can read them.
-- (Required because migration 099 locked the landlords SELECT grants to an
-- explicit column list.)
GRANT SELECT (response_rate, responded_review_count)
  ON public.landlords TO anon, authenticated;
