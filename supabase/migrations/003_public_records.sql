-- ============================================================
-- Migration 003: Public Records
-- ============================================================

CREATE TABLE public.public_records (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id     UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  landlord_id     UUID REFERENCES public.landlords(id) ON DELETE CASCADE,
  -- Nullable — records can exist without a claimed landlord
  -- If landlord not claimed, show warning on property page

  record_type     TEXT CHECK (record_type IN (
    'hpd_violation','dob_violation','court_case',
    'eviction_filing','311_complaint','code_enforcement',
    'lsc_eviction','chicago_violation','sf_eviction',
    'boston_violation','philly_violation','austin_complaint',
    'seattle_violation','la_violation','court_listener'
  )) NOT NULL,

  source          TEXT NOT NULL,   -- 'nyc_hpd','nyc_dob','nyc_registration','courtlistener','lsc', etc.
  source_id       TEXT,            -- Original ID in source system (for dedup)
  source_url      TEXT,            -- Link to original record

  severity        TEXT CHECK (severity IN ('low','medium','high','critical')),
  status          TEXT,            -- 'open','closed','pending','dismissed'

  title           TEXT NOT NULL,
  description     TEXT,
  violation_class TEXT,            -- 'A','B','C' for HPD; 'I' for info orders
  case_number     TEXT,

  filed_date      DATE,
  closed_date     DATE,

  -- For court records
  plaintiff_name  TEXT,
  defendant_name  TEXT,
  court_name      TEXT,
  nature_of_suit  TEXT,
  outcome         TEXT,

  raw_data        JSONB,           -- Full source payload preserved
  last_synced_at  TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_records_property ON public.public_records(property_id);
CREATE INDEX idx_records_landlord ON public.public_records(landlord_id);
CREATE INDEX idx_records_type ON public.public_records(record_type);
CREATE INDEX idx_records_source ON public.public_records(source, source_id);
CREATE INDEX idx_records_severity ON public.public_records(severity);
CREATE INDEX idx_records_status ON public.public_records(status);
CREATE INDEX idx_records_filed ON public.public_records(filed_date DESC);

-- Unique constraint for idempotent upserts
CREATE UNIQUE INDEX idx_records_source_dedup ON public.public_records(source, source_id)
  WHERE source_id IS NOT NULL;

-- ─── UNLINKED RECORDS ─────────────────────────────────────────
-- Records that couldn't be matched to a landlord or property — admin review queue
CREATE TABLE public.unlinked_records (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  record_type     TEXT NOT NULL,
  source          TEXT NOT NULL,
  source_id       TEXT,
  raw_data        JSONB NOT NULL,
  address_raw     TEXT,             -- Address as it came from the source
  owner_name_raw  TEXT,             -- Owner name as it came from source
  match_score     NUMERIC(3,2),     -- Best trgm similarity score we found
  match_candidate_id UUID,          -- Best match landlord/property candidate
  admin_notes     TEXT,
  resolved        BOOLEAN DEFAULT FALSE,
  resolved_by     UUID REFERENCES public.profiles(id),
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_unlinked_resolved ON public.unlinked_records(resolved);
