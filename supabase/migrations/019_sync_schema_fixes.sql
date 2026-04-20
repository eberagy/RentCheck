-- Fix schema issues blocking all data syncs:
--
-- 1. record_type CHECK constraint is too restrictive — every city sync uses a
--    custom value (houston_violation, miami_violation, etc.) NOT in the allowed list.
--    Drop the check entirely; record_type is just a label/filter, not security-critical.
--
-- 2. Add proper UNIQUE constraint on public_records(source, source_id) so PostgREST
--    upsert can use it. The existing partial unique index doesn't work with onConflict.
--
-- 3. Add unique index on properties(address_normalized, city, state_abbr) for dedup.

-- ── 1. Drop overly-restrictive record_type CHECK ─────────────────────────────
ALTER TABLE public.public_records DROP CONSTRAINT IF EXISTS public_records_record_type_check;
-- Add a simple NOT NULL check instead
ALTER TABLE public.public_records ALTER COLUMN record_type SET NOT NULL;

-- ── 2. UNIQUE constraint on public_records(source, source_id) ────────────────
-- Drop partial index first to avoid conflict
DROP INDEX IF EXISTS idx_records_source_dedup;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'public_records_source_source_id_unique'
      AND conrelid = 'public.public_records'::regclass
  ) THEN
    ALTER TABLE public.public_records
      ADD CONSTRAINT public_records_source_source_id_unique
      UNIQUE (source, source_id);
  END IF;
END $$;

-- ── 3. Properties dedup unique index ────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'properties'
      AND indexname = 'properties_address_normalized_city_state_unique'
  ) THEN
    CREATE UNIQUE INDEX properties_address_normalized_city_state_unique
      ON public.properties (address_normalized, city, state_abbr)
      WHERE address_normalized IS NOT NULL AND address_normalized != '';
  END IF;
END $$;
