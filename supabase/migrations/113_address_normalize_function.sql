-- 2026-05-02 — Address normalization parity (P1 from NEXT_SESSION.md).
--
-- Background: lib/data-sync/utils.ts normalizeAddress() collapses whitespace,
-- expands long-form street suffixes (street→st, avenue→ave, …) and strips
-- punctuation. A historical sync path inserted properties without computing
-- this column, leaving 44,378 of 69,013 rows (64%) with
-- properties.address_normalized = NULL. New record syncs join via
-- properties.address_normalized so those properties were unreachable —
-- which is why nyc_hpd, nyc_dob, sf_housing show >90% unlinked records.
--
-- This migration installs a Postgres mirror of the JS function and runs it
-- across the properties table once. Where multiple rows in the same
-- (normalized_addr, city, state_abbr) group exist, only the lowest-id row
-- is filled — the rest stay NULL so the unique index stays satisfied.
-- (1,444 properties remain NULL after the backfill; those are within-city
-- duplicates that need a separate dedupe pass, not a normalization fix.)
--
-- Records (~321k unlinked) are NOT touched here — that backfill is a
-- separate operation gated on the trigger-disable / chunked-update
-- pattern documented in NEXT_SESSION.md.

CREATE OR REPLACE FUNCTION public.normalize_address(addr text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
AS $func$
DECLARE
  s text;
BEGIN
  IF addr IS NULL THEN RETURN NULL; END IF;
  s := lower(addr);
  s := regexp_replace(s, '\s+', ' ', 'g');
  s := regexp_replace(s, '\ystreet\y',    'st',   'g');
  s := regexp_replace(s, '\yavenue\y',    'ave',  'g');
  s := regexp_replace(s, '\yboulevard\y', 'blvd', 'g');
  s := regexp_replace(s, '\ydrive\y',     'dr',   'g');
  s := regexp_replace(s, '\yroad\y',      'rd',   'g');
  s := regexp_replace(s, '\ylane\y',      'ln',   'g');
  s := regexp_replace(s, '\ycourt\y',     'ct',   'g');
  s := regexp_replace(s, '\yplace\y',     'pl',   'g');
  s := regexp_replace(s, '[.,#]', '', 'g');
  s := btrim(s);
  RETURN s;
END;
$func$;

COMMENT ON FUNCTION public.normalize_address(text) IS
  'Mirrors lib/data-sync/utils.ts normalizeAddress(). Keep these two in sync.';

-- One-shot backfill, dedupe-safe.
-- For each (normalized_addr, city, state_abbr) group, fill only the
-- lowest-id row IF none of the rows in that group is already normalized.
-- Rows where address_normalized was already correct are skipped.
-- Within-city duplicates (1,444 rows) stay NULL — flagged for a separate
-- dedupe migration.
WITH groups AS (
  SELECT public.normalize_address(address_line1) AS n_addr,
         city, state_abbr,
         COALESCE(
           BOOL_OR(address_normalized = public.normalize_address(address_line1)),
           false
         ) AS already_normalized,
         (ARRAY_AGG(id ORDER BY id))[1] AS first_id
    FROM public.properties
   WHERE address_line1 IS NOT NULL
   GROUP BY public.normalize_address(address_line1), city, state_abbr
)
UPDATE public.properties p
   SET address_normalized = public.normalize_address(p.address_line1)
  FROM groups g
 WHERE p.id = g.first_id
   AND NOT g.already_normalized;
