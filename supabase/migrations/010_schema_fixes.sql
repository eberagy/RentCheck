-- ============================================================
-- Migration 010: Schema fixes for sync jobs
-- ============================================================

-- Drop the restrictive record_type CHECK and replace with a wider set
ALTER TABLE public.public_records DROP CONSTRAINT IF EXISTS public_records_record_type_check;
ALTER TABLE public.public_records
  ADD CONSTRAINT public_records_record_type_check
    CHECK (record_type IN (
      -- NYC
      'hpd_violation','dob_violation','dob_complaint','court_case',
      -- Evictions
      'eviction','eviction_filing','lsc_eviction',
      -- City-specific
      'chicago_violation','sf_violation','sf_eviction',
      'boston_violation','philly_violation','austin_complaint',
      'seattle_violation','la_violation',
      -- Court
      'court_listener',
      -- Generic
      'code_enforcement','311_complaint'
    ));

-- Make title nullable (sync jobs generate it from description; NOT NULL too strict)
ALTER TABLE public.public_records ALTER COLUMN title DROP NOT NULL;

-- Add resolved_date as alias alongside closed_date
ALTER TABLE public.public_records ADD COLUMN IF NOT EXISTS resolved_date DATE;

-- Keep closed_date and resolved_date in sync via trigger
CREATE OR REPLACE FUNCTION public.sync_record_dates()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.resolved_date IS NOT NULL AND NEW.closed_date IS NULL THEN
    NEW.closed_date := NEW.resolved_date;
  END IF;
  IF NEW.closed_date IS NOT NULL AND NEW.resolved_date IS NULL THEN
    NEW.resolved_date := NEW.closed_date;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_record_dates ON public.public_records;
CREATE TRIGGER trg_sync_record_dates
  BEFORE INSERT OR UPDATE ON public.public_records
  FOR EACH ROW EXECUTE FUNCTION public.sync_record_dates();
