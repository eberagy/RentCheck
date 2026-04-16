-- ============================================================
-- Migration 006: Full Text Search + Trigram Indexes
-- ============================================================

-- ─── LANDLORD SEARCH VECTOR ──────────────────────────────────
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

CREATE INDEX idx_landlords_fts ON public.landlords USING GIN(search_vector);

-- Trigram for fuzzy/partial matching ("John Sm" → "John Smith")
CREATE INDEX idx_landlords_trgm_name ON public.landlords
  USING GIN(display_name gin_trgm_ops);
CREATE INDEX idx_landlords_trgm_biz ON public.landlords
  USING GIN(coalesce(business_name, '') gin_trgm_ops);

-- ─── PROPERTY SEARCH VECTOR ──────────────────────────────────
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

CREATE INDEX idx_properties_fts ON public.properties USING GIN(search_vector);
CREATE INDEX idx_properties_trgm_addr ON public.properties
  USING GIN(address_line1 gin_trgm_ops);

-- ─── COMBINED SEARCH FUNCTION ────────────────────────────────
-- Returns ranked results for the search bar (landlords + properties)
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
    -- Landlords
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
    -- Properties
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
