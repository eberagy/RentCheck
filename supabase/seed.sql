-- ============================================================
-- Seed Data for Development
-- Run: supabase db reset (applies migrations + seed)
-- ============================================================

-- Create admin user (set password via Supabase dashboard)
-- INSERT INTO auth.users ... handled by Supabase Auth

-- Seed landlords for testing (Baltimore, Pittsburgh, State College focus)
INSERT INTO public.landlords (slug, display_name, business_name, city, state, state_abbr, zip, avg_rating, review_count, is_claimed, is_verified, open_violation_count, grade)
VALUES
  ('baltimore-properties-llc-baltimore', 'Baltimore Properties LLC', 'Baltimore Properties LLC', 'Baltimore', 'Maryland', 'MD', '21201', 2.8, 14, false, false, 8, 'D'),
  ('sunrise-management-pittsburgh', 'Sunrise Management', 'Sunrise Property Management Inc', 'Pittsburgh', 'Pennsylvania', 'PA', '15213', 3.9, 22, true, true, 2, 'B'),
  ('state-college-rentals-state-college', 'State College Rentals', 'SCR Holdings LLC', 'State College', 'Pennsylvania', 'PA', '16801', 1.8, 31, false, false, 15, 'F'),
  ('james-wilson-baltimore', 'James Wilson', NULL, 'Baltimore', 'Maryland', 'MD', '21218', 4.6, 8, true, true, 0, 'A'),
  ('university-village-apts-pittsburgh', 'University Village Apts', 'UV Residential LLC', 'Pittsburgh', 'Pennsylvania', 'PA', '15260', 3.1, 17, false, false, 6, 'C');

-- Seed properties
INSERT INTO public.properties (landlord_id, address_line1, city, state, state_abbr, zip, property_type, unit_count)
SELECT l.id, '123 Charles St', 'Baltimore', 'Maryland', 'MD', '21201', 'apartment', 24
FROM public.landlords l WHERE l.slug = 'baltimore-properties-llc-baltimore';

INSERT INTO public.properties (landlord_id, address_line1, city, state, state_abbr, zip, property_type, unit_count)
SELECT l.id, '456 Forbes Ave', 'Pittsburgh', 'Pennsylvania', 'PA', '15213', 'apartment', 12
FROM public.landlords l WHERE l.slug = 'sunrise-management-pittsburgh';

INSERT INTO public.properties (landlord_id, address_line1, city, state, state_abbr, zip, property_type, unit_count)
SELECT l.id, '789 College Ave', 'State College', 'Pennsylvania', 'PA', '16801', 'apartment', 48
FROM public.landlords l WHERE l.slug = 'state-college-rentals-state-college';

-- Additional college-city landlords
INSERT INTO public.landlords (slug, display_name, business_name, city, state, state_abbr, zip, avg_rating, review_count, is_claimed, is_verified, open_violation_count, grade)
VALUES
  ('coastal-carolinas-housing-conway', 'Coastal Carolinas Housing', NULL, 'Conway', 'South Carolina', 'SC', '29526', 3.2, 9, false, false, 1, 'C'),
  ('homewood-realty-baltimore', 'Homewood Realty Group', 'Homewood Realty Group LLC', 'Baltimore', 'Maryland', 'MD', '21218', 4.2, 23, false, false, 0, 'A'),
  ('north-oakland-rentals-pittsburgh', 'North Oakland Rentals', NULL, 'Pittsburgh', 'Pennsylvania', 'PA', '15213', 1.8, 31, false, false, 12, 'F');

-- Sample public records
INSERT INTO public.public_records (source, source_id, record_type, landlord_id, description, severity, status, filed_date)
SELECT 'nyc_hpd', 'SEED-HPD-001', 'hpd_violation', l.id,
  'Class C — Immediately hazardous: No heat/hot water supplied to building',
  'high', 'open', CURRENT_DATE - INTERVAL '45 days'
FROM public.landlords l WHERE l.slug = 'baltimore-properties-llc-baltimore' LIMIT 1;

INSERT INTO public.public_records (source, source_id, record_type, landlord_id, description, severity, status, filed_date)
SELECT 'court_listener', 'SEED-CL-001', 'eviction', l.id,
  'Eviction filing — non-payment of rent (multiple units)',
  'high', 'open', CURRENT_DATE - INTERVAL '60 days'
FROM public.landlords l WHERE l.slug = 'state-college-rentals-state-college' LIMIT 1;

INSERT INTO public.public_records (source, source_id, record_type, landlord_id, description, severity, status, filed_date)
SELECT 'chicago_buildings', 'SEED-CHI-001', 'chicago_violation', l.id,
  'Failed inspection: Broken exterior staircase posing fall hazard',
  'high', 'open', CURRENT_DATE - INTERVAL '15 days'
FROM public.landlords l WHERE l.slug = 'north-oakland-rentals-pittsburgh' LIMIT 1;

-- Trigger grade recalculation
UPDATE public.landlords SET updated_at = NOW();

