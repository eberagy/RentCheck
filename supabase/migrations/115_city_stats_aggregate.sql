-- 2026-05-04 — Refresh city_stats via single aggregate INSERT instead of
-- loop-per-city.
--
-- Background: refresh_city_stats() walked ~200 cities calling
-- count_city_records() per city. After the 321k record backfill the
-- per-city RPC times out for NYC (28k+ NY properties, 192k HPD records),
-- which fails the whole loop and leaves city_stats stale (last-refreshed
-- 2026-05-02, before the backfill).
--
-- This rewrite computes record_count for every (city, state) pair in two
-- aggregate scans: one over public_records joined to properties, one over
-- public_records joined to landlords. UNIONed and counted DISTINCT
-- record id per (city, state). Should run in ~30s instead of timing out.

CREATE OR REPLACE FUNCTION public.refresh_city_stats()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Single pass: union via-property + via-landlord per (city, state),
  -- DISTINCT-count record ids so a record landlord+property covers both.
  WITH city_records AS (
    SELECT lower(p.city) AS city_key, p.state_abbr, p.city, pr.id AS record_id
      FROM public.public_records pr
      JOIN public.properties p ON p.id = pr.property_id
     WHERE p.city IS NOT NULL AND p.state_abbr IS NOT NULL
    UNION
    SELECT lower(l.city) AS city_key, l.state_abbr, l.city, pr.id AS record_id
      FROM public.public_records pr
      JOIN public.landlords l ON l.id = pr.landlord_id
     WHERE l.city IS NOT NULL AND l.state_abbr IS NOT NULL
  ),
  per_city AS (
    SELECT city_key, state_abbr,
           MIN(city) AS canonical_city,
           COUNT(DISTINCT record_id) AS record_count
      FROM city_records
     GROUP BY city_key, state_abbr
  ),
  landlord_counts AS (
    SELECT lower(city) AS city_key, state_abbr, COUNT(*) AS landlord_count
      FROM public.landlords
     WHERE city IS NOT NULL AND state_abbr IS NOT NULL
     GROUP BY lower(city), state_abbr
  )
  INSERT INTO public.city_stats (state_abbr, city, record_count, landlord_count, refreshed_at)
  SELECT
    pc.state_abbr,
    pc.canonical_city,
    pc.record_count,
    COALESCE(lc.landlord_count, 0),
    NOW()
  FROM per_city pc
  LEFT JOIN landlord_counts lc
    ON lc.city_key = pc.city_key AND lc.state_abbr = pc.state_abbr
  ON CONFLICT (state_abbr, city) DO UPDATE SET
    record_count = EXCLUDED.record_count,
    landlord_count = EXCLUDED.landlord_count,
    refreshed_at = NOW();
END;
$$;
