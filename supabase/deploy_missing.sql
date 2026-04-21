-- ============================================================
-- DEPLOY MISSING: Run this in Supabase SQL Editor
-- Catches up all functions/columns that code depends on
-- Safe to run multiple times (idempotent)
-- ============================================================

-- ─── EXTENSIONS ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── 006: SEARCH FUNCTION + INDEXES ────────────────────────
-- Add search_vector column to landlords
DO $$ BEGIN
  ALTER TABLE public.landlords ADD COLUMN search_vector tsvector
    GENERATED ALWAYS AS (
      to_tsvector('english',
        coalesce(display_name, '') || ' ' ||
        coalesce(business_name, '') || ' ' ||
        coalesce(city, '') || ' ' ||
        coalesce(state, '') || ' ' ||
        coalesce(state_abbr, '') || ' ' ||
        coalesce(zip, '')
      )
    ) STORED;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_landlords_fts ON public.landlords USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_landlords_trgm_name ON public.landlords USING GIN(display_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_landlords_trgm_biz ON public.landlords USING GIN(coalesce(business_name, '') gin_trgm_ops);

-- Add search_vector column to properties
DO $$ BEGIN
  ALTER TABLE public.properties ADD COLUMN search_vector tsvector
    GENERATED ALWAYS AS (
      to_tsvector('english',
        coalesce(address_line1, '') || ' ' ||
        coalesce(city, '') || ' ' ||
        coalesce(state, '') || ' ' ||
        coalesce(state_abbr, '') || ' ' ||
        coalesce(zip, '')
      )
    ) STORED;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_properties_fts ON public.properties USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_properties_trgm_addr ON public.properties USING GIN(address_line1 gin_trgm_ops);

-- The search_all RPC function (used by /api/search and SearchBar)
CREATE OR REPLACE FUNCTION public.search_all(query TEXT, limit_n INTEGER DEFAULT 10)
RETURNS TABLE (
  result_type   TEXT,
  id            UUID,
  slug          TEXT,
  display_name  TEXT,
  city          TEXT,
  state_abbr    TEXT,
  avg_rating    NUMERIC,
  review_count  INTEGER,
  is_verified   BOOLEAN,
  rank          REAL
) AS $$
BEGIN
  RETURN QUERY
    SELECT
      'landlord'::TEXT,
      l.id,
      l.slug,
      l.display_name,
      l.city,
      l.state_abbr,
      l.avg_rating,
      l.review_count,
      l.is_verified,
      ts_rank(l.search_vector, plainto_tsquery('english', query)) AS rank
    FROM public.landlords l
    WHERE l.search_vector @@ plainto_tsquery('english', query)
       OR similarity(l.display_name, query) > 0.3
       OR similarity(coalesce(l.business_name, ''), query) > 0.3
    UNION ALL
    SELECT
      'property'::TEXT,
      p.id,
      NULL::TEXT,
      p.address_line1,
      p.city,
      p.state_abbr,
      p.avg_rating,
      p.review_count,
      FALSE,
      ts_rank(p.search_vector, plainto_tsquery('english', query)) AS rank
    FROM public.properties p
    WHERE p.search_vector @@ plainto_tsquery('english', query)
       OR similarity(p.address_line1, query) > 0.35
    ORDER BY rank DESC, review_count DESC
    LIMIT limit_n;
END;
$$ LANGUAGE plpgsql STABLE;

-- ─── 009: HELPER FUNCTIONS ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.find_landlord_by_name(
  input_name TEXT,
  input_city TEXT DEFAULT NULL,
  min_similarity FLOAT DEFAULT 0.7
)
RETURNS TABLE(id UUID, display_name TEXT, similarity FLOAT)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    l.id,
    l.display_name,
    similarity(l.display_name, input_name) AS similarity
  FROM public.landlords l
  WHERE
    similarity(l.display_name, input_name) >= min_similarity
    AND (input_city IS NULL OR l.city ILIKE input_city)
  ORDER BY similarity(l.display_name, input_name) DESC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.increment_flag_count(review_id UUID)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE public.reviews
  SET flag_count = flag_count + 1
  WHERE id = review_id;
$$;

CREATE OR REPLACE FUNCTION public.toggle_helpful_vote(
  p_review_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  already_voted BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.review_helpful
    WHERE review_id = p_review_id AND user_id = p_user_id
  ) INTO already_voted;

  IF already_voted THEN
    DELETE FROM public.review_helpful WHERE review_id = p_review_id AND user_id = p_user_id;
    RETURN FALSE;
  ELSE
    INSERT INTO public.review_helpful (review_id, user_id) VALUES (p_review_id, p_user_id)
      ON CONFLICT DO NOTHING;
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.search_all TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_landlord_by_name TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_flag_count TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_helpful_vote TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_platform_stats TO anon, authenticated;

-- ─── 021: PROFILES CITY/STATE ───────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS city       TEXT,
  ADD COLUMN IF NOT EXISTS state      TEXT;

-- ─── DONE ───────────────────────────────────────────────────
SELECT 'All migrations applied successfully' AS status;
