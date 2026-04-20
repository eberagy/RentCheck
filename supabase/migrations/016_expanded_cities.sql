-- ============================================================
-- Migration 016: Expanded City Coverage + New Record Types
-- 7 new cities: Phoenix, Minneapolis, Portland, San Antonio,
-- Detroit, Charlotte, Columbus
-- Plus: nyc_311, hud_inspection
-- ============================================================

ALTER TABLE public.public_records
  DROP CONSTRAINT IF EXISTS public_records_record_type_check;

ALTER TABLE public.public_records
  ADD CONSTRAINT public_records_record_type_check
  CHECK (record_type IN (
    -- NYC
    'hpd_violation','dob_violation','dob_complaint','nyc_311',
    -- National
    'court_case','eviction','eviction_filing','code_enforcement',
    'lsc_eviction','court_listener','hud_inspection',
    -- Generic
    '311_complaint',
    -- Existing cities
    'chicago_violation','sf_violation','sf_eviction',
    'boston_violation','philly_violation','austin_complaint',
    'seattle_violation','la_violation',
    'pittsburgh_violation','baltimore_vacant_notice',
    'houston_violation','miami_violation','denver_violation',
    'dallas_violation','dc_violation','atlanta_violation','nashville_violation',
    -- New cities
    'phoenix_violation','minneapolis_violation','portland_violation',
    'san_antonio_violation','detroit_violation','charlotte_violation',
    'columbus_violation'
  ));

-- Add new cities to MAJOR_CITIES reference (informational comment)
-- Phoenix AZ, Minneapolis MN, Portland OR already in types/index.ts
-- San Antonio TX, Detroit MI, Charlotte NC, Columbus OH are new
