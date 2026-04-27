-- 2026-04-27 — RPCs for the homepage "Cities covered" stat + sitemap.
-- The page tried to fetch every (city, state_abbr) row over PostgREST
-- and dedupe in JS, but PostgREST silently caps `.select().limit(N)` at
-- 1000 rows; the homepage was rendering 18 instead of the real 121.
-- Both helpers are STABLE and grant-safe for anon/authenticated reads.

CREATE OR REPLACE FUNCTION public.count_cities_with_landlords(min_landlords integer DEFAULT 5)
RETURNS bigint
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*) FROM (
    SELECT city, state_abbr
    FROM public.landlords
    WHERE city IS NOT NULL AND state_abbr IS NOT NULL
    GROUP BY city, state_abbr
    HAVING COUNT(*) >= min_landlords
  ) sub;
$$;

CREATE OR REPLACE FUNCTION public.cities_with_landlords(min_landlords integer DEFAULT 5)
RETURNS TABLE(city text, state_abbr text)
LANGUAGE sql
STABLE
AS $$
  SELECT city, state_abbr
  FROM public.landlords
  WHERE city IS NOT NULL AND state_abbr IS NOT NULL
  GROUP BY city, state_abbr
  HAVING COUNT(*) >= min_landlords;
$$;

GRANT EXECUTE ON FUNCTION public.count_cities_with_landlords(integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cities_with_landlords(integer) TO anon, authenticated;
