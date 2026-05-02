-- 2026-05-01 — Cache city record counts.
-- count_city_records_multi('NYC aliases', 'NY') runs ~20s on prod
-- (it walks ~73k record IDs across 5 borough cities). The /city
-- page hits this on every cold-cache load — visitors wait 10+s.
--
-- Cache the totals in a small per-city table refreshed nightly. The
-- city page reads with a single indexed lookup; the cron RPC below
-- recomputes once per day. Falls back to the live RPC if the cache
-- row is missing (new city or stale).

CREATE TABLE IF NOT EXISTS public.city_stats (
  state_abbr  TEXT NOT NULL,
  city        TEXT NOT NULL,
  -- Total non-informational records linked to landlords or properties
  -- in this city (uses the same definition as count_city_records).
  record_count INTEGER NOT NULL DEFAULT 0,
  landlord_count INTEGER NOT NULL DEFAULT 0,
  refreshed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (state_abbr, city)
);

GRANT SELECT ON public.city_stats TO anon, authenticated;

-- Refresh helper. Call nightly from a cron route.
CREATE OR REPLACE FUNCTION public.refresh_city_stats()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  r RECORD;
BEGIN
  -- Walk every distinct (city, state_abbr) with at least 1 landlord row
  -- and compute its record + landlord counts. Up to a few hundred rows
  -- so this is fast even though the underlying counts are slow.
  FOR r IN
    SELECT city, state_abbr
    FROM public.landlords
    WHERE city IS NOT NULL AND state_abbr IS NOT NULL
    GROUP BY city, state_abbr
  LOOP
    INSERT INTO public.city_stats (state_abbr, city, record_count, landlord_count, refreshed_at)
    VALUES (
      r.state_abbr,
      r.city,
      public.count_city_records(r.city, r.state_abbr),
      (SELECT COUNT(*) FROM public.landlords WHERE city = r.city AND state_abbr = r.state_abbr),
      NOW()
    )
    ON CONFLICT (state_abbr, city) DO UPDATE SET
      record_count   = EXCLUDED.record_count,
      landlord_count = EXCLUDED.landlord_count,
      refreshed_at   = NOW();
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_city_stats() TO authenticated;
