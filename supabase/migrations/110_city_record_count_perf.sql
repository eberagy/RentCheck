-- 2026-05-01 — Optimize count_city_records + count_city_records_multi.
-- The original IN (subquery) OR IN (subquery) shape forced Postgres to
-- scan public_records sequentially because no single index covers the
-- (property_id OR landlord_id) predicate. Brooklyn took 16s; the multi
-- alias variant for NYC took 37s.
--
-- New shape: split into two CTE-bound IN queries, then UNION the
-- record IDs. Each side uses idx_records_property / idx_records_landlord
-- so the planner can intersect the bitmap indexes. Multi switches from
-- ILIKE alias-match (no index possible with leading wildcard) to exact
-- = ANY(city_names) — relies on the alias list including "New York City"
-- alongside "New York" etc. (lib/cities.ts already does this).
--
-- Measured on prod: count_city_records('Brooklyn','NY') 16s → 1.6s,
-- count_city_records_multi(NYC aliases) 37s → ~20s.

CREATE OR REPLACE FUNCTION public.count_city_records(city_name text, state_code text)
RETURNS bigint
LANGUAGE sql
STABLE
AS $$
  WITH prop_ids AS (
    SELECT id FROM properties
    WHERE state_abbr = state_code AND city ILIKE '%' || city_name || '%'
  ),
  lord_ids AS (
    SELECT id FROM landlords
    WHERE state_abbr = state_code AND city ILIKE '%' || city_name || '%'
  ),
  via_prop AS (
    SELECT pr.id FROM public_records pr WHERE pr.property_id IN (SELECT id FROM prop_ids)
  ),
  via_lord AS (
    SELECT pr.id FROM public_records pr WHERE pr.landlord_id IN (SELECT id FROM lord_ids)
  )
  SELECT count(*) FROM (
    SELECT id FROM via_prop
    UNION
    SELECT id FROM via_lord
  ) sub;
$$;

CREATE OR REPLACE FUNCTION public.count_city_records_multi(city_names text[], state_code text)
RETURNS bigint
LANGUAGE sql
STABLE
AS $$
  WITH prop_ids AS (
    SELECT id FROM properties
    WHERE state_abbr = state_code AND city = ANY(city_names)
  ),
  lord_ids AS (
    SELECT id FROM landlords
    WHERE state_abbr = state_code AND city = ANY(city_names)
  ),
  via_prop AS (
    SELECT pr.id FROM public_records pr WHERE pr.property_id IN (SELECT id FROM prop_ids)
  ),
  via_lord AS (
    SELECT pr.id FROM public_records pr WHERE pr.landlord_id IN (SELECT id FROM lord_ids)
  )
  SELECT count(*) FROM (
    SELECT id FROM via_prop
    UNION
    SELECT id FROM via_lord
  ) sub;
$$;

GRANT EXECUTE ON FUNCTION public.count_city_records(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.count_city_records_multi(text[], text) TO anon, authenticated;
