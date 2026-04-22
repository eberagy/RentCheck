-- Migration 026: Link public records to properties, fix city names, update counts
-- Run via Supabase Management API on 2026-04-22

-- 1. Allow null zip on properties (was blocking property creation from records)
ALTER TABLE properties ALTER COLUMN zip DROP NOT NULL;

-- 2. Fix city name: "Manhattan" → "New York" for search compatibility
UPDATE landlords SET city = 'New York' WHERE city = 'Manhattan' AND state_abbr = 'NY';

-- 3. Create properties from Chicago violation addresses
INSERT INTO properties (id, address_line1, city, state, state_abbr, created_at, updated_at, review_count, avg_rating)
SELECT DISTINCT ON (raw_data->>'address')
  gen_random_uuid(), raw_data->>'address', 'Chicago', 'Illinois', 'IL', now(), now(), 0, 0
FROM public_records
WHERE source = 'chicago_buildings' AND raw_data->>'address' IS NOT NULL AND property_id IS NULL
ON CONFLICT DO NOTHING;

-- 4. Create properties from Kansas City violation addresses
INSERT INTO properties (id, address_line1, city, state, state_abbr, zip, created_at, updated_at, review_count, avg_rating)
SELECT DISTINCT ON (raw_data->>'address')
  gen_random_uuid(), raw_data->>'address', 'Kansas City', 'Missouri', 'MO', raw_data->>'zip_code', now(), now(), 0, 0
FROM public_records
WHERE source = 'kansas_city_code' AND raw_data->>'address' IS NOT NULL AND property_id IS NULL
ON CONFLICT DO NOTHING;

-- 5. Create properties from Pittsburgh violation addresses
INSERT INTO properties (id, address_line1, city, state, state_abbr, created_at, updated_at, review_count, avg_rating)
SELECT DISTINCT ON (raw_data->>'address')
  gen_random_uuid(), raw_data->>'address', 'Pittsburgh', 'Pennsylvania', 'PA', now(), now(), 0, 0
FROM public_records
WHERE source = 'pittsburgh_pli' AND raw_data->>'address' IS NOT NULL AND property_id IS NULL
ON CONFLICT DO NOTHING;

-- 6. Link records to properties by address match
UPDATE public_records pr SET property_id = p.id
FROM properties p
WHERE pr.source = 'chicago_buildings' AND pr.property_id IS NULL
  AND pr.raw_data->>'address' IS NOT NULL
  AND upper(p.address_line1) = upper(pr.raw_data->>'address') AND p.city = 'Chicago';

UPDATE public_records pr SET property_id = p.id
FROM properties p
WHERE pr.source = 'kansas_city_code' AND pr.property_id IS NULL
  AND pr.raw_data->>'address' IS NOT NULL
  AND upper(p.address_line1) = upper(pr.raw_data->>'address') AND p.city = 'Kansas City';

UPDATE public_records pr SET property_id = p.id
FROM properties p
WHERE pr.source = 'pittsburgh_pli' AND pr.property_id IS NULL
  AND pr.raw_data->>'address' IS NOT NULL
  AND upper(p.address_line1) = upper(pr.raw_data->>'address') AND p.city = 'Pittsburgh';

-- 7. Refresh landlord violation counts from actual records
UPDATE landlords l SET
  total_violation_count = sub.total,
  open_violation_count = sub.open_count
FROM (
  SELECT landlord_id,
    count(*) as total,
    count(*) FILTER (WHERE status IS DISTINCT FROM 'closed' AND status IS DISTINCT FROM 'dismissed') as open_count
  FROM public_records
  WHERE landlord_id IS NOT NULL
  GROUP BY landlord_id
) sub
WHERE l.id = sub.landlord_id;
