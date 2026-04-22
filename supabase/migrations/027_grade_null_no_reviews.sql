-- Grade should be NULL when landlord has no reviews and no violations/evictions
-- Previously defaulted to a grade even with 0 data, which was misleading

CREATE OR REPLACE FUNCTION public.compute_landlord_grade(
  avg_rating NUMERIC,
  open_violations INTEGER,
  evictions INTEGER
)
RETURNS TEXT AS $$
DECLARE
  score INTEGER := 100;
  has_reviews BOOLEAN := (avg_rating IS NOT NULL AND avg_rating > 0);
  has_violations BOOLEAN := (COALESCE(open_violations, 0) > 0);
  has_evictions BOOLEAN := (COALESCE(evictions, 0) > 0);
BEGIN
  -- If no reviews and no violations/evictions, no grade yet
  IF NOT has_reviews AND NOT has_violations AND NOT has_evictions THEN
    RETURN NULL;
  END IF;

  -- Deduct for low rating (only if they have reviews)
  IF has_reviews THEN
    IF avg_rating < 1.5 THEN score := score - 40;
    ELSIF avg_rating < 2.5 THEN score := score - 25;
    ELSIF avg_rating < 3.5 THEN score := score - 10;
    ELSIF avg_rating < 4.0 THEN score := score - 5;
    END IF;
  END IF;

  -- Deduct for open violations
  score := score - LEAST(COALESCE(open_violations, 0) * 3, 30);
  -- Deduct for evictions
  score := score - LEAST(COALESCE(evictions, 0) * 5, 30);

  -- Map score to grade
  IF score >= 90 THEN RETURN 'A';
  ELSIF score >= 75 THEN RETURN 'B';
  ELSIF score >= 60 THEN RETURN 'C';
  ELSIF score >= 45 THEN RETURN 'D';
  ELSE RETURN 'F';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Clear grades on landlords that have 0 reviews and 0 violations
UPDATE public.landlords
SET grade = NULL
WHERE COALESCE(review_count, 0) = 0
  AND COALESCE(open_violation_count, 0) = 0
  AND COALESCE(eviction_count, 0) = 0;
