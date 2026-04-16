-- ============================================================
-- Migration 009: Helper RPC Functions
-- Used by API routes and data-sync jobs
-- ============================================================

-- ─── FUZZY LANDLORD LOOKUP ────────────────────────────────────
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

-- ─── INCREMENT FLAG COUNT ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.increment_flag_count(review_id UUID)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE public.reviews
  SET flag_count = flag_count + 1
  WHERE id = review_id;
$$;

-- ─── INCREMENT HELPFUL COUNT ──────────────────────────────────
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
    UPDATE public.reviews SET helpful_count = GREATEST(helpful_count - 1, 0) WHERE id = p_review_id;
    RETURN FALSE;
  ELSE
    INSERT INTO public.review_helpful (review_id, user_id) VALUES (p_review_id, p_user_id)
      ON CONFLICT DO NOTHING;
    UPDATE public.reviews SET helpful_count = helpful_count + 1 WHERE id = p_review_id;
    RETURN TRUE;
  END IF;
END;
$$;

-- ─── PLATFORM STATS FOR HOMEPAGE ─────────────────────────────
CREATE OR REPLACE FUNCTION public.get_platform_stats()
RETURNS JSON LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT json_build_object(
    'total_reviews', (SELECT COUNT(*) FROM public.reviews WHERE status = 'approved'),
    'total_landlords', (SELECT COUNT(*) FROM public.landlords),
    'total_records', (SELECT COUNT(*) FROM public.public_records),
    'total_cities', (SELECT COUNT(DISTINCT city) FROM public.landlords WHERE city IS NOT NULL)
  );
$$;

-- Grant execute to anon and authenticated
GRANT EXECUTE ON FUNCTION public.find_landlord_by_name TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_flag_count TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_helpful_vote TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_platform_stats TO anon, authenticated;
