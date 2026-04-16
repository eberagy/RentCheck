-- ============================================================
-- Migration 015: Baltimore + Pittsburgh Public Record Types
-- ============================================================

ALTER TABLE public.public_records
  DROP CONSTRAINT IF EXISTS public_records_record_type_check;

ALTER TABLE public.public_records
  ADD CONSTRAINT public_records_record_type_check
  CHECK (record_type IN (
    'hpd_violation','dob_violation','dob_complaint','court_case',
    'eviction','eviction_filing','311_complaint','code_enforcement',
    'lsc_eviction','chicago_violation','sf_violation','sf_eviction',
    'boston_violation','philly_violation','austin_complaint',
    'seattle_violation','la_violation','court_listener',
    'pittsburgh_violation','baltimore_vacant_notice'
  ));
