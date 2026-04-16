-- ============================================================
-- Migration 004: Supporting Tables
-- ============================================================

-- ─── REVIEW FLAGS ────────────────────────────────────────────
CREATE TABLE public.review_flags (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id   UUID REFERENCES public.reviews(id) ON DELETE CASCADE,
  flagged_by  UUID REFERENCES public.profiles(id),
  reason      TEXT CHECK (reason IN ('fake','defamatory','personal_info','spam','harassment','other')),
  note        TEXT,
  status      TEXT CHECK (status IN ('pending','reviewed','dismissed')) DEFAULT 'pending',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_flags_review ON public.review_flags(review_id);
CREATE INDEX idx_flags_status ON public.review_flags(status);

-- ─── HELPFUL VOTES ───────────────────────────────────────────
CREATE TABLE public.review_helpful (
  review_id UUID REFERENCES public.reviews(id) ON DELETE CASCADE,
  user_id   UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (review_id, user_id)
);

-- ─── RECORD DISPUTES ─────────────────────────────────────────
CREATE TABLE public.record_disputes (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  record_id       UUID REFERENCES public.public_records(id) ON DELETE CASCADE,
  disputed_by     UUID REFERENCES public.profiles(id),
  reason          TEXT NOT NULL,
  evidence_url    TEXT,
  status          TEXT CHECK (status IN ('pending','reviewed','resolved','dismissed')) DEFAULT 'pending',
  resolution_note TEXT,
  resolved_by     UUID REFERENCES public.profiles(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_disputes_status ON public.record_disputes(status);

-- ─── LANDLORD CLAIM REQUESTS ──────────────────────────────────
CREATE TABLE public.landlord_claims (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  landlord_id       UUID REFERENCES public.landlords(id) ON DELETE CASCADE,
  claimed_by        UUID REFERENCES public.profiles(id),
  verification_type TEXT CHECK (verification_type IN ('utility_bill','government_id','deed','business_reg','other')),
  doc_url           TEXT NOT NULL,   -- Uploaded proof document
  doc_filename      TEXT,
  status            TEXT CHECK (status IN ('pending','approved','rejected')) DEFAULT 'pending',
  admin_notes       TEXT,
  reviewed_by       UUID REFERENCES public.profiles(id),
  reviewed_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_claims_status ON public.landlord_claims(status);
CREATE INDEX idx_claims_landlord ON public.landlord_claims(landlord_id);

-- ─── WATCHLIST ────────────────────────────────────────────────
-- Renters watch landlords/properties for new activity alerts
CREATE TABLE public.watchlist (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  landlord_id  UUID REFERENCES public.landlords(id) ON DELETE CASCADE,
  property_id  UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  notify_email BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, landlord_id),
  CONSTRAINT watch_target CHECK (landlord_id IS NOT NULL OR property_id IS NOT NULL)
);
CREATE INDEX idx_watchlist_user ON public.watchlist(user_id);
CREATE INDEX idx_watchlist_landlord ON public.watchlist(landlord_id);

-- ─── DATA SYNC LOG ────────────────────────────────────────────
CREATE TABLE public.sync_log (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source        TEXT NOT NULL,
  started_at    TIMESTAMPTZ DEFAULT NOW(),
  completed_at  TIMESTAMPTZ,
  records_added INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_skipped INTEGER DEFAULT 0,
  error_message TEXT,
  status        TEXT CHECK (status IN ('running','completed','failed')) DEFAULT 'running'
);
CREATE INDEX idx_sync_source ON public.sync_log(source);
CREATE INDEX idx_sync_started ON public.sync_log(started_at DESC);

-- ─── SEARCH EVENTS ───────────────────────────────────────────
CREATE TABLE public.search_events (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  query         TEXT,
  results_count INTEGER,
  city          TEXT,
  state         TEXT,
  user_id       UUID REFERENCES public.profiles(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── INSURANCE REFERRALS (scaffolded) ────────────────────────
CREATE TABLE public.insurance_referrals (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES public.profiles(id),
  provider      TEXT NOT NULL DEFAULT 'lemonade',
  clicked_at    TIMESTAMPTZ DEFAULT NOW(),
  referral_code TEXT,
  converted     BOOLEAN DEFAULT FALSE
);

-- ─── SCREENING REQUESTS (scaffolded — Phase 2) ───────────────
CREATE TABLE public.screening_requests (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  requested_by    UUID REFERENCES public.profiles(id),
  subject_email   TEXT,
  provider        TEXT DEFAULT 'transunion',
  report_url      TEXT,
  status          TEXT CHECK (status IN ('initiated','completed','failed')) DEFAULT 'initiated',
  -- FCRA consent tracking
  consent_given   BOOLEAN DEFAULT FALSE,
  consent_at      TIMESTAMPTZ,
  consent_ip      TEXT,
  consent_ua      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
