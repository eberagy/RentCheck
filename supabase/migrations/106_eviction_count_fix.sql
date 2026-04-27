-- 2026-04-26 — eviction_count trigger missed record_type='eviction'.
-- The original function in migration 007 listed only the legacy eviction
-- record types. After we added NYC City Marshal evictions (3,390 rows
-- and counting) using the canonical record_type='eviction', no landlord
-- saw their eviction_count update. This patch widens the IN list to
-- include 'eviction' and 'court_case' as well — every record_type a
-- reasonable person would think of as an eviction.
--
-- Also runs a one-time backfill so existing rows get the right count.
-- Idempotent: re-running won't double-count because the SELECT counts
-- rows directly, not increments.

CREATE OR REPLACE FUNCTION public.update_landlord_violation_counts()
RETURNS TRIGGER AS $$
DECLARE
  target_landlord_id UUID;
BEGIN
  target_landlord_id := COALESCE(NEW.landlord_id, OLD.landlord_id);

  IF target_landlord_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  UPDATE public.landlords SET
    open_violation_count = (
      SELECT COUNT(*) FROM public.public_records
      WHERE landlord_id = target_landlord_id
        AND status NOT IN ('closed','dismissed')
        AND record_type NOT IN ('court_case','lsc_eviction','court_listener','eviction','business_registration')
    ),
    total_violation_count = (
      SELECT COUNT(*) FROM public.public_records
      WHERE landlord_id = target_landlord_id
        AND record_type NOT IN ('court_case','lsc_eviction','court_listener','eviction','business_registration')
    ),
    eviction_count = (
      SELECT COUNT(*) FROM public.public_records
      WHERE landlord_id = target_landlord_id
        AND record_type IN ('eviction','eviction_filing','lsc_eviction','sf_eviction','court_case','court_listener')
    ),
    updated_at = NOW()
  WHERE id = target_landlord_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- One-time backfill across every landlord that has any record linked.
UPDATE public.landlords l SET
  open_violation_count = (
    SELECT COUNT(*) FROM public.public_records
    WHERE landlord_id = l.id
      AND status NOT IN ('closed','dismissed')
      AND record_type NOT IN ('court_case','lsc_eviction','court_listener','eviction','business_registration')
  ),
  total_violation_count = (
    SELECT COUNT(*) FROM public.public_records
    WHERE landlord_id = l.id
      AND record_type NOT IN ('court_case','lsc_eviction','court_listener','eviction','business_registration')
  ),
  eviction_count = (
    SELECT COUNT(*) FROM public.public_records
    WHERE landlord_id = l.id
      AND record_type IN ('eviction','eviction_filing','lsc_eviction','sf_eviction','court_case','court_listener')
  )
WHERE EXISTS (
  SELECT 1 FROM public.public_records WHERE landlord_id = l.id
);
