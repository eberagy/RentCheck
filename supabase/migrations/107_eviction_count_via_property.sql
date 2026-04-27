-- 2026-04-26 — Count records attributed via property, not just direct.
-- Most public_records get linked to a property (by address) before they
-- get linked to a landlord (the property→landlord linkage happens later
-- via the mine-violation-owners sync). The aggregate counters on
-- landlords (eviction_count, open_violation_count, total_violation_count)
-- only counted records with landlord_id set directly, which left 3,390
-- NYC marshal evictions and most NYC HPD violations stranded — visible
-- on property pages but invisible on the landlord card.
--
-- Widen the count to also include records linked through any property
-- this landlord owns. Backfill once at the end.

CREATE OR REPLACE FUNCTION public.update_landlord_violation_counts()
RETURNS TRIGGER AS $$
DECLARE
  target_landlord_id UUID;
  affected_property_id UUID;
BEGIN
  target_landlord_id := COALESCE(NEW.landlord_id, OLD.landlord_id);
  affected_property_id := COALESCE(NEW.property_id, OLD.property_id);

  -- If the inserted/updated record has no landlord directly, fall back
  -- to whichever landlord owns the property. Otherwise nothing to do.
  IF target_landlord_id IS NULL AND affected_property_id IS NOT NULL THEN
    SELECT landlord_id INTO target_landlord_id
      FROM public.properties WHERE id = affected_property_id;
  END IF;

  IF target_landlord_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  UPDATE public.landlords SET
    open_violation_count = (
      SELECT COUNT(*) FROM public.public_records pr
      WHERE (pr.landlord_id = target_landlord_id
             OR pr.property_id IN (SELECT id FROM public.properties WHERE landlord_id = target_landlord_id))
        AND pr.status NOT IN ('closed','dismissed')
        AND pr.record_type NOT IN ('court_case','lsc_eviction','court_listener','eviction','business_registration')
    ),
    total_violation_count = (
      SELECT COUNT(*) FROM public.public_records pr
      WHERE (pr.landlord_id = target_landlord_id
             OR pr.property_id IN (SELECT id FROM public.properties WHERE landlord_id = target_landlord_id))
        AND pr.record_type NOT IN ('court_case','lsc_eviction','court_listener','eviction','business_registration')
    ),
    eviction_count = (
      SELECT COUNT(*) FROM public.public_records pr
      WHERE (pr.landlord_id = target_landlord_id
             OR pr.property_id IN (SELECT id FROM public.properties WHERE landlord_id = target_landlord_id))
        AND pr.record_type IN ('eviction','eviction_filing','lsc_eviction','sf_eviction','court_case','court_listener')
    ),
    updated_at = NOW()
  WHERE id = target_landlord_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- One-time backfill across every landlord that has any record (direct
-- or via a property they own).
WITH props_by_landlord AS (
  SELECT landlord_id, ARRAY_AGG(id) AS prop_ids
    FROM public.properties
   WHERE landlord_id IS NOT NULL
   GROUP BY landlord_id
)
UPDATE public.landlords l SET
  open_violation_count = (
    SELECT COUNT(*) FROM public.public_records pr
    WHERE (pr.landlord_id = l.id OR pr.property_id = ANY(p.prop_ids))
      AND pr.status NOT IN ('closed','dismissed')
      AND pr.record_type NOT IN ('court_case','lsc_eviction','court_listener','eviction','business_registration')
  ),
  total_violation_count = (
    SELECT COUNT(*) FROM public.public_records pr
    WHERE (pr.landlord_id = l.id OR pr.property_id = ANY(p.prop_ids))
      AND pr.record_type NOT IN ('court_case','lsc_eviction','court_listener','eviction','business_registration')
  ),
  eviction_count = (
    SELECT COUNT(*) FROM public.public_records pr
    WHERE (pr.landlord_id = l.id OR pr.property_id = ANY(p.prop_ids))
      AND pr.record_type IN ('eviction','eviction_filing','lsc_eviction','sf_eviction','court_case','court_listener')
  )
FROM props_by_landlord p
WHERE p.landlord_id = l.id;
