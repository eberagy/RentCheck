-- ============================================================
-- Migration 023: Auto-link triggers
-- When new public_records or properties are inserted, try to
-- automatically link them to the correct landlord.
-- ============================================================

-- ─── Auto-link new public_records to landlord via property ───
-- If a public_record has a property_id but no landlord_id,
-- inherit the landlord_id from the property.
CREATE OR REPLACE FUNCTION public.auto_link_record_to_landlord()
RETURNS TRIGGER AS $$
BEGIN
  -- Only act if we have a property but no landlord
  IF NEW.property_id IS NOT NULL AND NEW.landlord_id IS NULL THEN
    SELECT landlord_id INTO NEW.landlord_id
    FROM public.properties
    WHERE id = NEW.property_id
      AND landlord_id IS NOT NULL;
  END IF;

  -- If still no landlord but we have a property_id, check if
  -- other records on this property already have a landlord
  IF NEW.property_id IS NOT NULL AND NEW.landlord_id IS NULL THEN
    SELECT DISTINCT landlord_id INTO NEW.landlord_id
    FROM public.public_records
    WHERE property_id = NEW.property_id
      AND landlord_id IS NOT NULL
    LIMIT 1;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auto_link_record
  BEFORE INSERT ON public.public_records
  FOR EACH ROW EXECUTE FUNCTION public.auto_link_record_to_landlord();

-- ─── Auto-link new properties to landlord via existing records ───
-- If a property is inserted without a landlord_id, check if any
-- existing public_records at that address already have a landlord.
CREATE OR REPLACE FUNCTION public.auto_link_property_to_landlord()
RETURNS TRIGGER AS $$
DECLARE
  found_landlord_id UUID;
BEGIN
  IF NEW.landlord_id IS NULL AND NEW.address_normalized IS NOT NULL THEN
    -- Look for other properties at same normalized address that have a landlord
    SELECT landlord_id INTO found_landlord_id
    FROM public.properties
    WHERE address_normalized = NEW.address_normalized
      AND city = NEW.city
      AND state_abbr = NEW.state_abbr
      AND landlord_id IS NOT NULL
      AND id != NEW.id
    LIMIT 1;

    IF found_landlord_id IS NOT NULL THEN
      NEW.landlord_id := found_landlord_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auto_link_property
  BEFORE INSERT ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.auto_link_property_to_landlord();

-- ─── Cascade landlord_id when a property gets linked ─────────
-- When a property's landlord_id is set (was NULL, now has value),
-- propagate to all public_records on that property that lack a landlord.
CREATE OR REPLACE FUNCTION public.cascade_landlord_to_records()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.landlord_id IS NULL AND NEW.landlord_id IS NOT NULL THEN
    UPDATE public.public_records
    SET landlord_id = NEW.landlord_id
    WHERE property_id = NEW.id
      AND landlord_id IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cascade_landlord_to_records
  AFTER UPDATE OF landlord_id ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.cascade_landlord_to_records();

-- ─── Cascade landlord_id when a record gets linked ───────────
-- When a public_record's landlord_id is set, propagate to its
-- property (if the property has no landlord yet).
CREATE OR REPLACE FUNCTION public.cascade_landlord_to_property()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.landlord_id IS NOT NULL AND NEW.property_id IS NOT NULL THEN
    UPDATE public.properties
    SET landlord_id = NEW.landlord_id
    WHERE id = NEW.property_id
      AND landlord_id IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cascade_landlord_to_property
  AFTER INSERT OR UPDATE OF landlord_id ON public.public_records
  FOR EACH ROW EXECUTE FUNCTION public.cascade_landlord_to_property();
