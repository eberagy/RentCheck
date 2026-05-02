-- 2026-05-01 — Prevent duplicate watchlist rows.
-- watchlist had no unique constraint on (user_id, landlord_id) or
-- (user_id, property_id), so a fast double-tap on the Watch button
-- could create two rows with one fading + one persisting. The toggle
-- check that hides the button afterwards isn't atomic with the insert.
--
-- Two partial unique indexes — one for landlord watches, one for
-- property watches. (Composite unique would also work but a single
-- row only ever has one of the two FKs set, never both.)

CREATE UNIQUE INDEX IF NOT EXISTS idx_watchlist_unique_landlord
  ON public.watchlist (user_id, landlord_id)
  WHERE landlord_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_watchlist_unique_property
  ON public.watchlist (user_id, property_id)
  WHERE property_id IS NOT NULL;
