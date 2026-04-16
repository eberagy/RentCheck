-- ============================================================
-- Migration 007: Triggers & Functions
-- ============================================================

-- ─── AUTO updated_at ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_landlords_updated_at
  BEFORE UPDATE ON public.landlords
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_properties_updated_at
  BEFORE UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── AUTO-CREATE PROFILE ON SIGNUP ───────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── UPDATE LANDLORD RATING + COUNTS ─────────────────────────
CREATE OR REPLACE FUNCTION public.update_landlord_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.landlords SET
    avg_rating = COALESCE((
      SELECT ROUND(AVG(rating_overall)::NUMERIC, 2)
      FROM public.reviews
      WHERE landlord_id = COALESCE(NEW.landlord_id, OLD.landlord_id)
        AND status = 'approved'
    ), 0),
    review_count = (
      SELECT COUNT(*)
      FROM public.reviews
      WHERE landlord_id = COALESCE(NEW.landlord_id, OLD.landlord_id)
        AND status = 'approved'
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.landlord_id, OLD.landlord_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_review_landlord_stats
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_landlord_stats();

-- ─── UPDATE LANDLORD VIOLATION COUNTS ────────────────────────
CREATE OR REPLACE FUNCTION public.update_landlord_violation_counts()
RETURNS TRIGGER AS $$
DECLARE
  target_landlord_id UUID;
BEGIN
  target_landlord_id := COALESCE(NEW.landlord_id, OLD.landlord_id);
  IF target_landlord_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  UPDATE public.landlords SET
    open_violation_count = (
      SELECT COUNT(*) FROM public.public_records
      WHERE landlord_id = target_landlord_id
        AND status NOT IN ('closed','dismissed')
        AND record_type NOT IN ('court_case','lsc_eviction','court_listener')
    ),
    total_violation_count = (
      SELECT COUNT(*) FROM public.public_records
      WHERE landlord_id = target_landlord_id
        AND record_type NOT IN ('court_case','lsc_eviction','court_listener')
    ),
    eviction_count = (
      SELECT COUNT(*) FROM public.public_records
      WHERE landlord_id = target_landlord_id
        AND record_type IN ('eviction_filing','lsc_eviction','sf_eviction')
    ),
    updated_at = NOW()
  WHERE id = target_landlord_id;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_record_landlord_counts
  AFTER INSERT OR UPDATE OR DELETE ON public.public_records
  FOR EACH ROW EXECUTE FUNCTION public.update_landlord_violation_counts();

-- ─── COMPUTE LANDLORD GRADE ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.compute_landlord_grade(
  avg_rating NUMERIC,
  open_violations INTEGER,
  evictions INTEGER
)
RETURNS TEXT AS $$
DECLARE
  score INTEGER := 100;
BEGIN
  -- Deduct for low rating
  IF avg_rating < 1.5 THEN score := score - 40;
  ELSIF avg_rating < 2.5 THEN score := score - 25;
  ELSIF avg_rating < 3.5 THEN score := score - 10;
  ELSIF avg_rating < 4.0 THEN score := score - 5;
  END IF;
  -- Deduct for open violations
  score := score - LEAST(open_violations * 3, 30);
  -- Deduct for evictions
  score := score - LEAST(evictions * 5, 30);
  -- Map score to grade
  IF score >= 90 THEN RETURN 'A';
  ELSIF score >= 75 THEN RETURN 'B';
  ELSIF score >= 60 THEN RETURN 'C';
  ELSIF score >= 45 THEN RETURN 'D';
  ELSE RETURN 'F';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger to update grade whenever stats change
CREATE OR REPLACE FUNCTION public.update_landlord_grade()
RETURNS TRIGGER AS $$
BEGIN
  NEW.grade = public.compute_landlord_grade(
    NEW.avg_rating,
    NEW.open_violation_count,
    NEW.eviction_count
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_landlord_grade
  BEFORE UPDATE OF avg_rating, open_violation_count, eviction_count ON public.landlords
  FOR EACH ROW EXECUTE FUNCTION public.update_landlord_grade();

-- ─── SLUG GENERATION ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.generate_landlord_slug(
  p_name TEXT,
  p_city TEXT,
  p_state TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter   INTEGER := 0;
BEGIN
  base_slug := lower(
    regexp_replace(
      trim(
        unaccent(p_name) || '-' || unaccent(p_city) ||
        CASE WHEN p_state IS NOT NULL THEN '-' || p_state ELSE '' END
      ),
      '[^a-z0-9]+', '-', 'g'
    )
  );
  base_slug := regexp_replace(base_slug, '^-+|-+$', '', 'g');
  final_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM public.landlords WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- ─── HELPFUL COUNT DENORM ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_helpful_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.reviews SET helpful_count = helpful_count + 1
    WHERE id = NEW.review_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.reviews SET helpful_count = GREATEST(helpful_count - 1, 0)
    WHERE id = OLD.review_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_helpful_count
  AFTER INSERT OR DELETE ON public.review_helpful
  FOR EACH ROW EXECUTE FUNCTION public.update_helpful_count();

-- ─── FLAG COUNT DENORM ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_flag_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.reviews SET flag_count = flag_count + 1 WHERE id = NEW.review_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.reviews SET flag_count = GREATEST(flag_count - 1, 0) WHERE id = OLD.review_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_flag_count
  AFTER INSERT OR DELETE ON public.review_flags
  FOR EACH ROW EXECUTE FUNCTION public.update_flag_count();
