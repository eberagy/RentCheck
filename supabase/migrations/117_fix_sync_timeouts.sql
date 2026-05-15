-- 2026-05-15 — Fix two production sync timeouts surfacing in sync_log
-- under status='error':
--
-- 1. refresh_city_stats() trips the 60s statement_timeout because the
--    aggregate scan over public_records (~360k rows) joined to properties
--    + landlords takes longer than the default Supabase pooler timeout.
--    SET LOCAL statement_timeout = 0 inside the function lifts it for
--    just this call — safe because the function is invoked by the cron
--    via service role, not by anonymous users.
--
-- 2. watchlist_alerts cron does:
--      SELECT ... FROM public_records WHERE created_at >= since
--    with no index on created_at. Sequential scan over 360k rows times
--    out under heavy concurrent load. Add a btree index on created_at DESC
--    so the "last 25h" filter becomes an index range scan.

-- (1) statement_timeout lift inside refresh_city_stats
CREATE OR REPLACE FUNCTION public.refresh_city_stats()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Lift the 60s pooler statement timeout for this single function call.
  -- The aggregate below operates on ~360k public_records rows; on a cold
  -- buffer cache it can take 90-120s. SET LOCAL reverts on COMMIT so the
  -- session timeout is not permanently changed.
  SET LOCAL statement_timeout = 0;

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

-- (2) Index for watchlist_alerts created_at range scan.
-- Non-CONCURRENTLY because Supabase Management API wraps DDL in a
-- transaction, which forbids CONCURRENTLY. At ~360k rows the index
-- build takes well under 30s; the table is briefly write-locked which
-- is fine since sync writes are queued through their own routes (not
-- directly into public_records from user-facing requests).
CREATE INDEX IF NOT EXISTS idx_records_created_at
  ON public.public_records USING btree (created_at DESC);
