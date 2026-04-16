-- ============================================================
-- RentCheck — PASTE THIS ENTIRE FILE INTO SUPABASE SQL EDITOR
-- It runs all migrations in the correct order.
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── 001: CORE TABLES ────────────────────────────────────────

CREATE TABLE public.profiles (
  id                    UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email                 TEXT NOT NULL,
  full_name             TEXT,
  user_type             TEXT CHECK (user_type IN ('renter','landlord','admin')) DEFAULT 'renter',
  is_verified_landlord  BOOLEAN DEFAULT FALSE,
  is_banned             BOOLEAN DEFAULT FALSE,
  review_count          INTEGER DEFAULT 0,
  stripe_customer_id    TEXT,
  stripe_subscription_id TEXT,
  subscription_status   TEXT,
  avatar_url            TEXT,
  bio                   TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_profiles_email ON public.profiles(email);

CREATE TABLE public.landlords (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug                  TEXT UNIQUE NOT NULL,
  display_name          TEXT NOT NULL,
  business_name         TEXT,
  claimed_by            UUID REFERENCES public.profiles(id),
  claimed_at            TIMESTAMPTZ,
  is_claimed            BOOLEAN DEFAULT FALSE,
  is_verified           BOOLEAN DEFAULT FALSE,
  verification_docs_url TEXT,
  verification_date     TIMESTAMPTZ,
  avg_rating            NUMERIC(3,2) DEFAULT 0,
  review_count          INTEGER DEFAULT 0,
  city                  TEXT,
  state                 TEXT,
  state_abbr            TEXT,
  zip                   TEXT,
  lat                   NUMERIC(10,7),
  lng                   NUMERIC(10,7),
  bio                   TEXT,
  website               TEXT,
  phone                 TEXT,
  grade                 TEXT CHECK (grade IN ('A','B','C','D','F')),
  open_violation_count  INTEGER DEFAULT 0,
  total_violation_count INTEGER DEFAULT 0,
  eviction_count        INTEGER DEFAULT 0,
  -- AI summary (generated monthly)
  ai_summary            TEXT,
  ai_summary_updated_at TIMESTAMPTZ,
  -- Scaffold
  stripe_price_id       TEXT,
  opencorporates_id     TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_landlords_slug ON public.landlords(slug);
CREATE INDEX idx_landlords_city_state ON public.landlords(city, state_abbr);
CREATE INDEX idx_landlords_claimed ON public.landlords(is_claimed);
CREATE INDEX idx_landlords_verified ON public.landlords(is_verified);

CREATE TABLE public.properties (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  landlord_id      UUID REFERENCES public.landlords(id) ON DELETE SET NULL,
  address_line1    TEXT NOT NULL,
  address_line2    TEXT,
  city             TEXT NOT NULL,
  state            TEXT NOT NULL,
  state_abbr       TEXT NOT NULL,
  zip              TEXT NOT NULL,
  lat              NUMERIC(10,7),
  lng              NUMERIC(10,7),
  property_type    TEXT CHECK (property_type IN ('apartment','house','condo','townhouse','commercial','other')),
  unit_count       INTEGER,
  year_built       INTEGER,
  avg_rating       NUMERIC(3,2) DEFAULT 0,
  review_count     INTEGER DEFAULT 0,
  address_normalized TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_properties_landlord ON public.properties(landlord_id);
CREATE INDEX idx_properties_city_state ON public.properties(city, state_abbr);
CREATE INDEX idx_properties_zip ON public.properties(zip);
CREATE UNIQUE INDEX idx_properties_normalized ON public.properties(address_normalized, city, state_abbr)
  WHERE address_normalized IS NOT NULL;

-- ─── 002: REVIEWS ────────────────────────────────────────────

CREATE TABLE public.reviews (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reviewer_id           UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  landlord_id           UUID REFERENCES public.landlords(id) ON DELETE CASCADE,
  property_id           UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  rating_overall        INTEGER CHECK (rating_overall BETWEEN 1 AND 5) NOT NULL,
  rating_responsiveness INTEGER CHECK (rating_responsiveness BETWEEN 1 AND 5),
  rating_maintenance    INTEGER CHECK (rating_maintenance BETWEEN 1 AND 5),
  rating_honesty        INTEGER CHECK (rating_honesty BETWEEN 1 AND 5),
  rating_lease_fairness INTEGER CHECK (rating_lease_fairness BETWEEN 1 AND 5),
  would_rent_again      BOOLEAN,
  title                 TEXT NOT NULL CHECK (length(title) BETWEEN 10 AND 150),
  body                  TEXT NOT NULL CHECK (length(body) >= 50 AND length(body) <= 2000),
  rental_period_start   DATE,
  rental_period_end     DATE,
  is_current_tenant     BOOLEAN DEFAULT FALSE,
  lease_verified        BOOLEAN DEFAULT FALSE,
  lease_doc_path        TEXT,
  lease_verified_at     TIMESTAMPTZ,
  lease_verified_by     UUID REFERENCES public.profiles(id),
  lease_rejection_reason TEXT,
  lease_hash            TEXT,
  lease_filename        TEXT,
  lease_file_size       INTEGER,
  status                TEXT CHECK (status IN ('pending','approved','rejected','flagged')) DEFAULT 'pending',
  moderation_note       TEXT,
  admin_notes           TEXT,
  moderated_by          UUID REFERENCES public.profiles(id),
  moderated_at          TIMESTAMPTZ,
  landlord_response     TEXT CHECK (landlord_response IS NULL OR length(landlord_response) <= 1000),
  landlord_response_at  TIMESTAMPTZ,
  landlord_response_status TEXT CHECK (landlord_response_status IS NULL OR landlord_response_status IN ('pending','approved','rejected')),
  helpful_count         INTEGER DEFAULT 0,
  flag_count            INTEGER DEFAULT 0,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_reviews_landlord ON public.reviews(landlord_id);
CREATE INDEX idx_reviews_status ON public.reviews(status);
CREATE INDEX idx_reviews_reviewer ON public.reviews(reviewer_id);
CREATE INDEX idx_reviews_created ON public.reviews(created_at DESC);
CREATE INDEX idx_reviews_property ON public.reviews(property_id);

CREATE TABLE public.review_evidence (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id   UUID REFERENCES public.reviews(id) ON DELETE CASCADE,
  file_path   TEXT NOT NULL,
  file_name   TEXT,
  file_type   TEXT,
  file_size   INTEGER,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 003: PUBLIC RECORDS ─────────────────────────────────────

CREATE TABLE public.public_records (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id     UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  landlord_id     UUID REFERENCES public.landlords(id) ON DELETE CASCADE,
  record_type     TEXT CHECK (record_type IN (
    'hpd_violation','dob_violation','dob_complaint','court_case',
    'eviction','eviction_filing','lsc_eviction',
    'chicago_violation','sf_violation','sf_eviction',
    'boston_violation','philly_violation','austin_complaint',
    'seattle_violation','la_violation','court_listener',
    'code_enforcement','311_complaint',
    'pittsburgh_violation','baltimore_vacant_notice'
  )) NOT NULL,
  source          TEXT NOT NULL,
  source_id       TEXT,
  source_url      TEXT,
  severity        TEXT CHECK (severity IN ('low','medium','high','critical','unknown')),
  status          TEXT,
  title           TEXT NOT NULL CHECK (length(title) BETWEEN 10 AND 150),
  description     TEXT,
  violation_class TEXT,
  case_number     TEXT,
  filed_date      DATE,
  closed_date     DATE,
  resolved_date   DATE,
  plaintiff_name  TEXT,
  defendant_name  TEXT,
  court_name      TEXT,
  nature_of_suit  TEXT,
  outcome         TEXT,
  raw_data        JSONB,
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
CREATE UNIQUE INDEX idx_records_source_dedup ON public.public_records(source, source_id)
  WHERE source_id IS NOT NULL;

CREATE TABLE public.unlinked_records (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source          TEXT NOT NULL,
  source_id       TEXT,
  raw_data        JSONB NOT NULL,
  reason          TEXT,
  resolved        BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 004: SUPPORTING TABLES ──────────────────────────────────

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

CREATE TABLE public.review_helpful (
  review_id UUID REFERENCES public.reviews(id) ON DELETE CASCADE,
  user_id   UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (review_id, user_id)
);

CREATE TABLE public.record_disputes (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  record_id       UUID REFERENCES public.public_records(id) ON DELETE CASCADE,
  disputed_by     UUID REFERENCES public.profiles(id),
  submitter_id    UUID REFERENCES public.profiles(id),
  reason          TEXT NOT NULL,
  detail          TEXT,
  evidence_url    TEXT,
  status          TEXT CHECK (status IN ('open','pending','reviewed','resolved','dismissed')) DEFAULT 'open',
  resolution_note TEXT,
  admin_notes     TEXT,
  admin_decision  TEXT,
  resolved_by     UUID REFERENCES public.profiles(id),
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_disputes_status ON public.record_disputes(status);

CREATE TABLE public.landlord_claims (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  landlord_id       UUID REFERENCES public.landlords(id) ON DELETE CASCADE,
  claimed_by        UUID REFERENCES public.profiles(id),
  verification_type TEXT CHECK (verification_type IN ('utility_bill','government_id','deed','business_reg','other')),
  doc_url           TEXT NOT NULL,
  doc_filename      TEXT,
  status            TEXT CHECK (status IN ('pending','approved','rejected')) DEFAULT 'pending',
  admin_notes       TEXT,
  reviewed_by       UUID REFERENCES public.profiles(id),
  reviewed_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_claims_status ON public.landlord_claims(status);
CREATE INDEX idx_claims_landlord ON public.landlord_claims(landlord_id);

CREATE TABLE public.watchlist (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  landlord_id  UUID REFERENCES public.landlords(id) ON DELETE CASCADE,
  property_id  UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  notify_email BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT watch_target CHECK (landlord_id IS NOT NULL OR property_id IS NOT NULL)
);
CREATE INDEX idx_watchlist_user ON public.watchlist(user_id);
CREATE INDEX idx_watchlist_landlord ON public.watchlist(landlord_id);
CREATE UNIQUE INDEX idx_watchlist_user_landlord ON public.watchlist(user_id, landlord_id)
  WHERE landlord_id IS NOT NULL;
CREATE UNIQUE INDEX idx_watchlist_user_property ON public.watchlist(user_id, property_id)
  WHERE property_id IS NOT NULL;

CREATE TABLE public.sync_log (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source          TEXT NOT NULL,
  started_at      TIMESTAMPTZ DEFAULT NOW(),
  finished_at     TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  records_added   INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_skipped INTEGER DEFAULT 0,
  error_message   TEXT,
  status          TEXT CHECK (status IN ('running','success','error','partial','completed','failed')) DEFAULT 'running'
);
CREATE INDEX idx_sync_source ON public.sync_log(source);
CREATE INDEX idx_sync_started ON public.sync_log(started_at DESC);

CREATE TABLE public.search_events (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  query         TEXT,
  results_count INTEGER,
  city          TEXT,
  state         TEXT,
  user_id       UUID REFERENCES public.profiles(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.landlord_submissions (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  submitted_by    UUID REFERENCES public.profiles(id),
  display_name    TEXT NOT NULL,
  business_name   TEXT,
  city            TEXT NOT NULL,
  state_abbr      TEXT NOT NULL,
  zip             TEXT,
  website         TEXT,
  phone           TEXT,
  notes           TEXT,
  status          TEXT CHECK (status IN ('pending','approved','rejected','duplicate')) DEFAULT 'pending',
  reviewed_by     UUID REFERENCES public.profiles(id),
  reviewed_at     TIMESTAMPTZ,
  landlord_id     UUID REFERENCES public.landlords(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_submissions_status ON public.landlord_submissions(status);

CREATE TABLE public.insurance_referrals (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES public.profiles(id),
  provider      TEXT NOT NULL DEFAULT 'lemonade',
  clicked_at    TIMESTAMPTZ DEFAULT NOW(),
  referral_code TEXT,
  converted     BOOLEAN DEFAULT FALSE
);

CREATE TABLE public.screening_requests (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  requested_by    UUID REFERENCES public.profiles(id),
  subject_email   TEXT,
  provider        TEXT DEFAULT 'transunion',
  report_url      TEXT,
  status          TEXT CHECK (status IN ('initiated','completed','failed')) DEFAULT 'initiated',
  consent_given   BOOLEAN DEFAULT FALSE,
  consent_at      TIMESTAMPTZ,
  consent_ip      TEXT,
  consent_ua      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 005: RLS POLICIES ───────────────────────────────────────

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landlords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.record_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landlord_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_helpful ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landlord_submissions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(
    (SELECT user_type = 'admin' FROM public.profiles WHERE id = auth.uid()),
    FALSE
  );
$$;

-- Profiles
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (id = auth.uid() OR is_admin());
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (id = auth.uid());

-- Landlords (public read)
CREATE POLICY "landlords_select_all" ON public.landlords FOR SELECT USING (TRUE);
CREATE POLICY "landlords_admin_write" ON public.landlords FOR ALL USING (is_admin());

-- Properties (public read)
CREATE POLICY "properties_select_all" ON public.properties FOR SELECT USING (TRUE);
CREATE POLICY "properties_admin_write" ON public.properties FOR ALL USING (is_admin());

-- Reviews
CREATE POLICY "reviews_select_approved" ON public.reviews FOR SELECT
  USING (status = 'approved' OR reviewer_id = auth.uid() OR is_admin());
CREATE POLICY "reviews_insert_own" ON public.reviews FOR INSERT WITH CHECK (reviewer_id = auth.uid());
CREATE POLICY "reviews_update_own" ON public.reviews FOR UPDATE
  USING (reviewer_id = auth.uid() OR is_admin());

-- Public records (public read)
CREATE POLICY "records_select_all" ON public.public_records FOR SELECT USING (TRUE);
CREATE POLICY "records_admin_write" ON public.public_records FOR ALL USING (is_admin());

-- Disputes (own + admin)
CREATE POLICY "disputes_select" ON public.record_disputes FOR SELECT
  USING (disputed_by = auth.uid() OR is_admin());
CREATE POLICY "disputes_insert" ON public.record_disputes FOR INSERT WITH CHECK (disputed_by = auth.uid());
CREATE POLICY "disputes_update_admin" ON public.record_disputes FOR UPDATE USING (is_admin());

-- Claims
CREATE POLICY "claims_select_own" ON public.landlord_claims FOR SELECT
  USING (claimed_by = auth.uid() OR is_admin());
CREATE POLICY "claims_insert_own" ON public.landlord_claims FOR INSERT WITH CHECK (claimed_by = auth.uid());
CREATE POLICY "claims_update_admin" ON public.landlord_claims FOR UPDATE USING (is_admin());

-- Watchlist
CREATE POLICY "watchlist_own" ON public.watchlist FOR ALL USING (user_id = auth.uid());

-- Flags
CREATE POLICY "flags_insert" ON public.review_flags FOR INSERT WITH CHECK (flagged_by = auth.uid());
CREATE POLICY "flags_admin" ON public.review_flags FOR SELECT USING (is_admin());

-- Helpful
CREATE POLICY "helpful_own" ON public.review_helpful FOR ALL USING (user_id = auth.uid());
CREATE POLICY "helpful_select" ON public.review_helpful FOR SELECT USING (TRUE);

-- Sync log (admin only)
CREATE POLICY "sync_log_admin" ON public.sync_log FOR ALL USING (is_admin());

-- Landlord submissions
CREATE POLICY "submissions_own" ON public.landlord_submissions FOR SELECT USING (submitted_by = auth.uid() OR is_admin());
CREATE POLICY "submissions_insert" ON public.landlord_submissions FOR INSERT WITH CHECK (submitted_by = auth.uid());
CREATE POLICY "submissions_admin" ON public.landlord_submissions FOR UPDATE USING (is_admin());

-- Storage bucket policies (run separately if needed)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('lease-docs', 'lease-docs', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('landlord-verification-docs', 'landlord-verification-docs', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('evidence-photos', 'evidence-photos', false);

-- ─── 006: FULL TEXT SEARCH ───────────────────────────────────

CREATE INDEX idx_landlords_fts ON public.landlords
  USING GIN (to_tsvector('english', coalesce(display_name,'') || ' ' || coalesce(business_name,'') || ' ' || coalesce(city,'')));
CREATE INDEX idx_properties_fts ON public.properties
  USING GIN (to_tsvector('english', coalesce(address_line1,'') || ' ' || coalesce(city,'')));
CREATE INDEX idx_landlords_trgm ON public.landlords USING GIN (display_name gin_trgm_ops);

CREATE OR REPLACE FUNCTION public.search_all(query TEXT, limit_n INT DEFAULT 10)
RETURNS TABLE (
  id UUID, result_type TEXT, display_name TEXT, subtitle TEXT,
  slug TEXT, avg_rating NUMERIC, review_count INT,
  city TEXT, state_abbr TEXT, rank FLOAT, is_claimed BOOLEAN
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT l.id, 'landlord'::TEXT, l.display_name,
    COALESCE(l.business_name, ''),
    l.slug, l.avg_rating, l.review_count,
    l.city, l.state_abbr,
    ts_rank(to_tsvector('english', l.display_name || ' ' || COALESCE(l.business_name,'') || ' ' || COALESCE(l.city,'')),
            plainto_tsquery('english', query)) AS rank,
    l.is_claimed
  FROM public.landlords l
  WHERE to_tsvector('english', l.display_name || ' ' || COALESCE(l.business_name,'') || ' ' || COALESCE(l.city,''))
          @@ plainto_tsquery('english', query)
     OR l.display_name ILIKE '%' || query || '%'
  UNION ALL
  SELECT p.id, 'property'::TEXT, p.address_line1,
    p.city || ', ' || p.state_abbr,
    p.id::TEXT, p.avg_rating, p.review_count,
    p.city, p.state_abbr,
    ts_rank(to_tsvector('english', p.address_line1 || ' ' || p.city),
            plainto_tsquery('english', query)) AS rank,
    FALSE
  FROM public.properties p
  WHERE to_tsvector('english', p.address_line1 || ' ' || p.city)
          @@ plainto_tsquery('english', query)
     OR p.address_line1 ILIKE '%' || query || '%'
  ORDER BY rank DESC
  LIMIT limit_n;
$$;
GRANT EXECUTE ON FUNCTION public.search_all TO anon, authenticated;

-- ─── 007: TRIGGERS & FUNCTIONS ───────────────────────────────

CREATE OR REPLACE FUNCTION public.compute_landlord_grade(
  avg_r NUMERIC, open_violations INT, evictions INT
) RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE score NUMERIC;
BEGIN
  score := COALESCE(avg_r, 0) * 20;
  score := score - (COALESCE(open_violations, 0) * 5);
  score := score - (COALESCE(evictions, 0) * 10);
  score := GREATEST(0, LEAST(100, score));
  IF score >= 85 THEN RETURN 'A';
  ELSIF score >= 70 THEN RETURN 'B';
  ELSIF score >= 55 THEN RETURN 'C';
  ELSIF score >= 40 THEN RETURN 'D';
  ELSE RETURN 'F';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_landlord_grade()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.grade := public.compute_landlord_grade(NEW.avg_rating, NEW.open_violation_count, NEW.eviction_count);
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_landlord_grade ON public.landlords;
CREATE TRIGGER trg_landlord_grade BEFORE INSERT OR UPDATE ON public.landlords
  FOR EACH ROW EXECUTE FUNCTION public.update_landlord_grade();

CREATE OR REPLACE FUNCTION public.generate_landlord_slug(name TEXT, city TEXT)
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  base_slug TEXT;
  candidate TEXT;
  counter INT := 1;
BEGIN
  base_slug := lower(regexp_replace(
    regexp_replace(unaccent(name || '-' || COALESCE(city, '')), '[^a-zA-Z0-9\s-]', '', 'g'),
    '\s+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);
  base_slug := left(base_slug, 60);
  candidate := base_slug;
  WHILE EXISTS (SELECT 1 FROM public.landlords WHERE slug = candidate) LOOP
    candidate := base_slug || '-' || counter;
    counter := counter + 1;
  END LOOP;
  RETURN candidate;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_landlord_slug()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := public.generate_landlord_slug(NEW.display_name, NEW.city);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_landlord_slug ON public.landlords;
CREATE TRIGGER trg_landlord_slug BEFORE INSERT ON public.landlords
  FOR EACH ROW EXECUTE FUNCTION public.set_landlord_slug();

CREATE OR REPLACE FUNCTION public.update_landlord_stats()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'approved' AND NEW.landlord_id IS NOT NULL THEN
    UPDATE public.landlords SET
      avg_rating = (SELECT AVG(rating_overall) FROM public.reviews WHERE landlord_id = NEW.landlord_id AND status = 'approved'),
      review_count = (SELECT COUNT(*) FROM public.reviews WHERE landlord_id = NEW.landlord_id AND status = 'approved')
    WHERE id = NEW.landlord_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status AND NEW.landlord_id IS NOT NULL THEN
    UPDATE public.landlords SET
      avg_rating = (SELECT COALESCE(AVG(rating_overall),0) FROM public.reviews WHERE landlord_id = NEW.landlord_id AND status = 'approved'),
      review_count = (SELECT COUNT(*) FROM public.reviews WHERE landlord_id = NEW.landlord_id AND status = 'approved')
    WHERE id = NEW.landlord_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
DROP TRIGGER IF EXISTS trg_landlord_stats ON public.reviews;
CREATE TRIGGER trg_landlord_stats AFTER INSERT OR UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_landlord_stats();

CREATE OR REPLACE FUNCTION public.update_violation_counts()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE l_id UUID;
BEGIN
  l_id := COALESCE(NEW.landlord_id, OLD.landlord_id);
  IF l_id IS NOT NULL THEN
    UPDATE public.landlords SET
      open_violation_count = (SELECT COUNT(*) FROM public.public_records
        WHERE landlord_id = l_id AND status NOT IN ('closed','dismissed') AND record_type NOT IN ('court_case','court_listener','eviction','eviction_filing','lsc_eviction')),
      total_violation_count = (SELECT COUNT(*) FROM public.public_records WHERE landlord_id = l_id),
      eviction_count = (SELECT COUNT(*) FROM public.public_records WHERE landlord_id = l_id AND record_type IN ('eviction','eviction_filing','lsc_eviction'))
    WHERE id = l_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
DROP TRIGGER IF EXISTS trg_violation_counts ON public.public_records;
CREATE TRIGGER trg_violation_counts AFTER INSERT OR UPDATE OR DELETE ON public.public_records
  FOR EACH ROW EXECUTE FUNCTION public.update_violation_counts();

CREATE OR REPLACE FUNCTION public.update_profile_review_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.reviewer_id IS NOT NULL THEN
    UPDATE public.profiles SET review_count = review_count + 1 WHERE id = NEW.reviewer_id;
  ELSIF TG_OP = 'DELETE' AND OLD.reviewer_id IS NOT NULL THEN
    UPDATE public.profiles SET review_count = GREATEST(review_count - 1, 0) WHERE id = OLD.reviewer_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
DROP TRIGGER IF EXISTS trg_profile_review_count ON public.reviews;
CREATE TRIGGER trg_profile_review_count AFTER INSERT OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_profile_review_count();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := NOW(); RETURN NEW; END;
$$;
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_landlords_updated_at BEFORE UPDATE ON public.landlords FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_properties_updated_at BEFORE UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_reviews_updated_at BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── 009: HELPER FUNCTIONS ───────────────────────────────────

CREATE OR REPLACE FUNCTION public.find_landlord_by_name(
  input_name TEXT, input_city TEXT DEFAULT NULL, min_similarity FLOAT DEFAULT 0.7
)
RETURNS TABLE(id UUID, display_name TEXT, similarity FLOAT)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT l.id, l.display_name, similarity(l.display_name, input_name) AS similarity
  FROM public.landlords l
  WHERE similarity(l.display_name, input_name) >= min_similarity
    AND (input_city IS NULL OR l.city ILIKE input_city)
  ORDER BY similarity(l.display_name, input_name) DESC LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.increment_flag_count(review_id UUID)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE public.reviews SET flag_count = flag_count + 1 WHERE id = review_id;
$$;

CREATE OR REPLACE FUNCTION public.toggle_helpful_vote(p_review_id UUID, p_user_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE already_voted BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.review_helpful WHERE review_id = p_review_id AND user_id = p_user_id) INTO already_voted;
  IF already_voted THEN
    DELETE FROM public.review_helpful WHERE review_id = p_review_id AND user_id = p_user_id;
    RETURN FALSE;
  ELSE
    INSERT INTO public.review_helpful (review_id, user_id) VALUES (p_review_id, p_user_id) ON CONFLICT DO NOTHING;
    RETURN TRUE;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_platform_stats()
RETURNS JSON LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT json_build_object(
    'total_reviews', (SELECT COUNT(*) FROM public.reviews WHERE status = 'approved'),
    'total_landlords', (SELECT COUNT(*) FROM public.landlords),
    'total_records', (SELECT COUNT(*) FROM public.public_records),
    'total_cities', (SELECT COUNT(DISTINCT city) FROM public.landlords WHERE city IS NOT NULL)
  );
$$;

GRANT EXECUTE ON FUNCTION public.find_landlord_by_name TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_flag_count TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_helpful_vote TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_platform_stats TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_all TO anon, authenticated;

-- ============================================================
-- Migration 011: Landlord submissions
-- ============================================================

CREATE TABLE IF NOT EXISTS public.landlord_submissions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  display_name  TEXT NOT NULL,
  business_name TEXT,
  city          TEXT,
  state_abbr    CHAR(2),
  zip           TEXT,
  website       TEXT,
  phone         TEXT,
  notes         TEXT,
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'rejected', 'duplicate')),
  admin_notes   TEXT,
  reviewed_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_landlord_submissions_status ON public.landlord_submissions(status, created_at);

ALTER TABLE public.landlord_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated can insert submissions"
  ON public.landlord_submissions FOR INSERT
  TO authenticated
  WITH CHECK (submitted_by = auth.uid());

CREATE POLICY "users can view own submissions"
  ON public.landlord_submissions FOR SELECT
  TO authenticated
  USING (submitted_by = auth.uid());

CREATE POLICY "admins full access submissions"
  ON public.landlord_submissions FOR ALL
  TO authenticated
  USING (public.is_admin());

-- ============================================================
-- Migration 012: Notification preferences on profiles
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_reviews   BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_watchlist BOOLEAN NOT NULL DEFAULT true;

-- Done! Next: run supabase/seed.sql for sample data.
