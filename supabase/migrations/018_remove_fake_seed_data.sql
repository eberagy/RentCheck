-- Remove all fake/fictional seed data inserted by seed.sql
-- All seed landlords used hardcoded UUIDs in the pattern 11000xxx-0000-0000-0000-00000000000x
-- Real landlord/property data comes exclusively from the sync jobs (public_records, nyc-pluto, hud-multifamily, etc.)

-- Delete properties linked to seed landlords first (FK constraint)
DELETE FROM public.properties
WHERE landlord_id IN (
  SELECT id FROM public.landlords
  WHERE id::text LIKE '11000%'
);

-- Delete public records linked to seed landlords
DELETE FROM public.public_records
WHERE landlord_id IN (
  SELECT id FROM public.landlords
  WHERE id::text LIKE '11000%'
);

-- Delete reviews linked to seed landlords (none expected, but for safety)
DELETE FROM public.reviews
WHERE landlord_id IN (
  SELECT id FROM public.landlords
  WHERE id::text LIKE '11000%'
);

-- Delete the seed landlords themselves
DELETE FROM public.landlords
WHERE id::text LIKE '11000%';

-- Also zero out any remaining landlords with ratings but no reviews
-- (catches any other seed/test data)
UPDATE public.landlords SET avg_rating = 0 WHERE review_count = 0 AND avg_rating > 0;
UPDATE public.properties SET avg_rating = 0 WHERE review_count = 0 AND avg_rating > 0;
