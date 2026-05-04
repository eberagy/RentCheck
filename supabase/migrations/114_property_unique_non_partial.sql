-- 2026-05-03 — Make properties.(address_normalized, city, state_abbr) unique
-- without a partial WHERE clause so PostgREST upsert can target it.
--
-- The two existing unique indexes are partial:
--   idx_properties_normalized                          WHERE address_normalized IS NOT NULL
--   properties_address_normalized_city_state_unique    WHERE address_normalized IS NOT NULL AND <> ''
--
-- PostgREST sends `INSERT ... ON CONFLICT (address_normalized, city,
-- state_abbr) DO NOTHING`. Postgres needs to MATCH that conflict spec
-- against either:
--   (a) a non-partial unique index/constraint, OR
--   (b) a partial index where the ON CONFLICT clause includes the same
--       WHERE predicate.
--
-- supabase-js's `upsert(rows, { onConflict: '...', ignoreDuplicates: true })`
-- does NOT emit a WHERE in the ON CONFLICT clause, so option (b) is out.
-- Without a non-partial index, Postgres raises:
--   "there is no unique or exclusion constraint matching the ON CONFLICT
--    specification"
-- — which is exactly the error nyc_dob hit on the 2026-05-03 cron run
-- (the first time the property-upsert error capture surfaced it).
--
-- This migration creates a non-partial unique index. NULL values are
-- treated as DISTINCT (default Postgres behavior) so the 1,444 properties
-- with NULL address_normalized — the within-city duplicates left over by
-- migration 113 — don't collide with each other or with non-NULL rows.
--
-- The two old partial indexes are dropped; the new one supersedes both.

CREATE UNIQUE INDEX IF NOT EXISTS idx_properties_addrnorm_city_state
  ON public.properties (address_normalized, city, state_abbr);

DROP INDEX IF EXISTS public.idx_properties_normalized;
DROP INDEX IF EXISTS public.properties_address_normalized_city_state_unique;
