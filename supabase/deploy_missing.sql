-- ============================================================
-- DEPLOY MISSING: Run this in Supabase SQL Editor
-- Catches up ALL functions, columns, triggers that code depends on.
-- 100% safe to run multiple times (fully idempotent).
-- ============================================================

-- ─── EXTENSIONS ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- PART 1: MISSING COLUMNS
-- ============================================================

-- profiles (008, 012, 021)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_reviews BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_watchlist BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS state TEXT;

-- landlords (008)
ALTER TABLE public.landlords ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;

-- reviews (008)
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS lease_rejection_reason TEXT;

-- sync_log (008) — expand status constraint
ALTER TABLE public.sync_log DROP CONSTRAINT IF EXISTS sync_log_status_check;
ALTER TABLE public.sync_log ADD CONSTRAINT sync_log_status_check
  CHECK (status IN ('running','success','error','partial','completed','failed'));
ALTER TABLE public.sync_log ADD COLUMN IF NOT EXISTS finished_at TIMESTAMPTZ;

-- record_disputes (008) — richer admin resolution
ALTER TABLE public.record_disputes ADD COLUMN IF NOT EXISTS detail TEXT;
ALTER TABLE public.record_disputes ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE public.record_disputes ADD COLUMN IF NOT EXISTS admin_decision TEXT;
ALTER TABLE public.record_disputes ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
DO $$ BEGIN
  ALTER TABLE public.record_disputes ADD COLUMN submitter_id UUID REFERENCES public.profiles(id);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Expand disputes status enum
ALTER TABLE public.record_disputes DROP CONSTRAINT IF EXISTS record_disputes_status_check;
ALTER TABLE public.record_disputes ADD CONSTRAINT record_disputes_status_check
  CHECK (status IN ('open','pending','reviewed','resolved','dismissed'));
UPDATE public.record_disputes SET status = 'open' WHERE status = 'pending';

-- reviews response status (008)
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_landlord_response_status_check;
ALTER TABLE public.reviews ADD CONSTRAINT reviews_landlord_response_status_check
  CHECK (landlord_response_status IS NULL OR
         landlord_response_status IN ('pending','approved','rejected'));

-- public_records (010) — make title nullable, add resolved_date
ALTER TABLE public.public_records ALTER COLUMN title DROP NOT NULL;
ALTER TABLE public.public_records ADD COLUMN IF NOT EXISTS resolved_date DATE;

-- Drop overly-restrictive record_type CHECK (019)
ALTER TABLE public.public_records DROP CONSTRAINT IF EXISTS public_records_record_type_check;
ALTER TABLE public.public_records ALTER COLUMN record_type SET NOT NULL;

-- public_records unique constraint for upsert (019)
DROP INDEX IF EXISTS idx_records_source_dedup;
DO $$ BEGIN
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

-- Properties dedup index (019)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'properties_address_normalized_city_state_unique'
  ) THEN
    CREATE UNIQUE INDEX properties_address_normalized_city_state_unique
      ON public.properties (address_normalized, city, state_abbr)
      WHERE address_normalized IS NOT NULL AND address_normalized != '';
  END IF;
END $$;

-- landlord_submissions table (011, 013)
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
  proof_doc_url TEXT,
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'rejected', 'duplicate')),
  admin_notes   TEXT,
  reviewed_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_landlord_submissions_status ON public.landlord_submissions(status, created_at);

-- RLS on landlord_submissions
ALTER TABLE public.landlord_submissions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "authenticated can insert submissions"
    ON public.landlord_submissions FOR INSERT
    TO authenticated
    WITH CHECK (submitted_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "users can view own submissions"
    ON public.landlord_submissions FOR SELECT
    TO authenticated
    USING (submitted_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "admins full access submissions"
    ON public.landlord_submissions FOR ALL
    TO authenticated
    USING (public.is_admin());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Watchlist partial indexes (014)
ALTER TABLE public.watchlist DROP CONSTRAINT IF EXISTS watchlist_user_id_landlord_id_key;
DROP INDEX IF EXISTS idx_watchlist_user_landlord;
DROP INDEX IF EXISTS idx_watchlist_user_property;
CREATE UNIQUE INDEX IF NOT EXISTS idx_watchlist_user_landlord
  ON public.watchlist(user_id, landlord_id) WHERE landlord_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_watchlist_user_property
  ON public.watchlist(user_id, property_id) WHERE property_id IS NOT NULL;

-- ============================================================
-- PART 2: TRIGGERS & FUNCTIONS (007)
-- ============================================================

-- Auto updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DO $$ BEGIN CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER trg_landlords_updated_at BEFORE UPDATE ON public.landlords FOR EACH ROW EXECUTE FUNCTION public.set_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER trg_properties_updated_at BEFORE UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION public.set_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER trg_reviews_updated_at BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.set_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  ) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update landlord stats on review changes
CREATE OR REPLACE FUNCTION public.update_landlord_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.landlords SET
    avg_rating = COALESCE((
      SELECT ROUND(AVG(rating_overall)::NUMERIC, 2) FROM public.reviews
      WHERE landlord_id = COALESCE(NEW.landlord_id, OLD.landlord_id) AND status = 'approved'
    ), 0),
    review_count = (
      SELECT COUNT(*) FROM public.reviews
      WHERE landlord_id = COALESCE(NEW.landlord_id, OLD.landlord_id) AND status = 'approved'
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.landlord_id, OLD.landlord_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_review_landlord_stats ON public.reviews;
CREATE TRIGGER trg_review_landlord_stats
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_landlord_stats();

-- Update landlord violation counts
CREATE OR REPLACE FUNCTION public.update_landlord_violation_counts()
RETURNS TRIGGER AS $$
DECLARE target_landlord_id UUID;
BEGIN
  target_landlord_id := COALESCE(NEW.landlord_id, OLD.landlord_id);
  IF target_landlord_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;
  UPDATE public.landlords SET
    open_violation_count = (SELECT COUNT(*) FROM public.public_records WHERE landlord_id = target_landlord_id AND status NOT IN ('closed','dismissed') AND record_type NOT IN ('court_case','lsc_eviction','court_listener')),
    total_violation_count = (SELECT COUNT(*) FROM public.public_records WHERE landlord_id = target_landlord_id AND record_type NOT IN ('court_case','lsc_eviction','court_listener')),
    eviction_count = (SELECT COUNT(*) FROM public.public_records WHERE landlord_id = target_landlord_id AND record_type IN ('eviction_filing','lsc_eviction','sf_eviction')),
    updated_at = NOW()
  WHERE id = target_landlord_id;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_record_landlord_counts ON public.public_records;
CREATE TRIGGER trg_record_landlord_counts
  AFTER INSERT OR UPDATE OR DELETE ON public.public_records
  FOR EACH ROW EXECUTE FUNCTION public.update_landlord_violation_counts();

-- Compute landlord grade
CREATE OR REPLACE FUNCTION public.compute_landlord_grade(avg_rating NUMERIC, open_violations INTEGER, evictions INTEGER)
RETURNS TEXT AS $$
DECLARE score INTEGER := 100;
BEGIN
  IF avg_rating < 1.5 THEN score := score - 40;
  ELSIF avg_rating < 2.5 THEN score := score - 25;
  ELSIF avg_rating < 3.5 THEN score := score - 10;
  ELSIF avg_rating < 4.0 THEN score := score - 5;
  END IF;
  score := score - LEAST(open_violations * 3, 30);
  score := score - LEAST(evictions * 5, 30);
  IF score >= 90 THEN RETURN 'A';
  ELSIF score >= 75 THEN RETURN 'B';
  ELSIF score >= 60 THEN RETURN 'C';
  ELSIF score >= 45 THEN RETURN 'D';
  ELSE RETURN 'F'; END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.update_landlord_grade()
RETURNS TRIGGER AS $$
BEGIN
  NEW.grade = public.compute_landlord_grade(NEW.avg_rating, NEW.open_violation_count, NEW.eviction_count);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_landlord_grade ON public.landlords;
CREATE TRIGGER trg_landlord_grade
  BEFORE UPDATE OF avg_rating, open_violation_count, eviction_count ON public.landlords
  FOR EACH ROW EXECUTE FUNCTION public.update_landlord_grade();

-- Slug generation
CREATE OR REPLACE FUNCTION public.generate_landlord_slug(p_name TEXT, p_city TEXT, p_state TEXT DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE base_slug TEXT; final_slug TEXT; counter INTEGER := 0;
BEGIN
  base_slug := lower(regexp_replace(trim(unaccent(p_name) || '-' || unaccent(p_city) || CASE WHEN p_state IS NOT NULL THEN '-' || p_state ELSE '' END), '[^a-z0-9]+', '-', 'g'));
  base_slug := regexp_replace(base_slug, '^-+|-+$', '', 'g');
  final_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM public.landlords WHERE slug = final_slug) LOOP
    counter := counter + 1; final_slug := base_slug || '-' || counter;
  END LOOP;
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Helpful count denorm
CREATE OR REPLACE FUNCTION public.update_helpful_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN UPDATE public.reviews SET helpful_count = helpful_count + 1 WHERE id = NEW.review_id;
  ELSIF TG_OP = 'DELETE' THEN UPDATE public.reviews SET helpful_count = GREATEST(helpful_count - 1, 0) WHERE id = OLD.review_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_helpful_count ON public.review_helpful;
CREATE TRIGGER trg_helpful_count AFTER INSERT OR DELETE ON public.review_helpful FOR EACH ROW EXECUTE FUNCTION public.update_helpful_count();

-- Flag count denorm
CREATE OR REPLACE FUNCTION public.update_flag_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN UPDATE public.reviews SET flag_count = flag_count + 1 WHERE id = NEW.review_id;
  ELSIF TG_OP = 'DELETE' THEN UPDATE public.reviews SET flag_count = GREATEST(flag_count - 1, 0) WHERE id = OLD.review_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_flag_count ON public.review_flags;
CREATE TRIGGER trg_flag_count AFTER INSERT OR DELETE ON public.review_flags FOR EACH ROW EXECUTE FUNCTION public.update_flag_count();

-- Profile review count trigger (008)
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
CREATE TRIGGER trg_profile_review_count AFTER INSERT OR DELETE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.update_profile_review_count();

-- Sync record dates (010)
CREATE OR REPLACE FUNCTION public.sync_record_dates()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.resolved_date IS NOT NULL AND NEW.closed_date IS NULL THEN NEW.closed_date := NEW.resolved_date; END IF;
  IF NEW.closed_date IS NOT NULL AND NEW.resolved_date IS NULL THEN NEW.resolved_date := NEW.closed_date; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_record_dates ON public.public_records;
CREATE TRIGGER trg_sync_record_dates BEFORE INSERT OR UPDATE ON public.public_records FOR EACH ROW EXECUTE FUNCTION public.sync_record_dates();

-- ============================================================
-- PART 3: SEARCH (006)
-- ============================================================

DO $$ BEGIN
  ALTER TABLE public.landlords ADD COLUMN search_vector tsvector
    GENERATED ALWAYS AS (
      to_tsvector('english',
        coalesce(display_name, '') || ' ' || coalesce(business_name, '') || ' ' ||
        coalesce(city, '') || ' ' || coalesce(state, '') || ' ' ||
        coalesce(state_abbr, '') || ' ' || coalesce(zip, '')
      )
    ) STORED;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_landlords_fts ON public.landlords USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_landlords_trgm_name ON public.landlords USING GIN(display_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_landlords_trgm_biz ON public.landlords USING GIN(coalesce(business_name, '') gin_trgm_ops);

DO $$ BEGIN
  ALTER TABLE public.properties ADD COLUMN search_vector tsvector
    GENERATED ALWAYS AS (
      to_tsvector('english',
        coalesce(address_line1, '') || ' ' || coalesce(city, '') || ' ' ||
        coalesce(state, '') || ' ' || coalesce(state_abbr, '') || ' ' || coalesce(zip, '')
      )
    ) STORED;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_properties_fts ON public.properties USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_properties_trgm_addr ON public.properties USING GIN(address_line1 gin_trgm_ops);

CREATE OR REPLACE FUNCTION public.search_all(query TEXT, limit_n INTEGER DEFAULT 10)
RETURNS TABLE (
  result_type TEXT, id UUID, slug TEXT, display_name TEXT,
  city TEXT, state_abbr TEXT, avg_rating NUMERIC,
  review_count INTEGER, is_verified BOOLEAN, rank REAL
) AS $$
BEGIN
  RETURN QUERY
    SELECT 'landlord'::TEXT, l.id, l.slug, l.display_name, l.city, l.state_abbr,
      l.avg_rating, l.review_count, l.is_verified,
      ts_rank(l.search_vector, plainto_tsquery('english', query)) AS rank
    FROM public.landlords l
    WHERE l.search_vector @@ plainto_tsquery('english', query)
       OR similarity(l.display_name, query) > 0.3
       OR similarity(coalesce(l.business_name, ''), query) > 0.3
    UNION ALL
    SELECT 'property'::TEXT, p.id, NULL::TEXT, p.address_line1, p.city, p.state_abbr,
      p.avg_rating, p.review_count, FALSE,
      ts_rank(p.search_vector, plainto_tsquery('english', query)) AS rank
    FROM public.properties p
    WHERE p.search_vector @@ plainto_tsquery('english', query)
       OR similarity(p.address_line1, query) > 0.35
    ORDER BY rank DESC, review_count DESC
    LIMIT limit_n;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- PART 4: HELPER RPCs (009)
-- ============================================================

CREATE OR REPLACE FUNCTION public.find_landlord_by_name(input_name TEXT, input_city TEXT DEFAULT NULL, min_similarity FLOAT DEFAULT 0.7)
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
    DELETE FROM public.review_helpful WHERE review_id = p_review_id AND user_id = p_user_id; RETURN FALSE;
  ELSE
    INSERT INTO public.review_helpful (review_id, user_id) VALUES (p_review_id, p_user_id) ON CONFLICT DO NOTHING; RETURN TRUE;
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.search_all TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_landlord_by_name TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_flag_count TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_helpful_vote TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_platform_stats TO anon, authenticated;

-- ============================================================
-- PART 5: STORAGE BUCKETS (020) — already created if you ran them
-- ============================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('lease-docs', 'lease-docs', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('landlord-verification-docs', 'landlord-verification-docs', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('evidence-photos', 'evidence-photos', false) ON CONFLICT (id) DO NOTHING;

-- ─── DONE ───────────────────────────────────────────────────
SELECT 'All migrations applied successfully' AS status;
