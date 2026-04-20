-- Fix seed data: reset avg_rating to 0 for landlords/properties that have no reviews.
-- Seed data had hardcoded avg_rating values that were never earned from real reviews.
-- The grade and violation counts are kept as-is (computed from public records, not reviews).

UPDATE public.landlords
SET avg_rating = 0
WHERE review_count = 0 AND avg_rating > 0;

UPDATE public.properties
SET avg_rating = 0
WHERE review_count = 0 AND avg_rating > 0;
