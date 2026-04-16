-- ============================================================
-- Migration 014: Launch integrity fixes
-- ============================================================

-- Replace the table-level landlord-only uniqueness with partial indexes
ALTER TABLE public.watchlist
  DROP CONSTRAINT IF EXISTS watchlist_user_id_landlord_id_key;

DROP INDEX IF EXISTS idx_watchlist_user_landlord;
DROP INDEX IF EXISTS idx_watchlist_user_property;

CREATE UNIQUE INDEX idx_watchlist_user_landlord
  ON public.watchlist(user_id, landlord_id)
  WHERE landlord_id IS NOT NULL;

CREATE UNIQUE INDEX idx_watchlist_user_property
  ON public.watchlist(user_id, property_id)
  WHERE property_id IS NOT NULL;

-- Tighten landlord verification uploads so users can only upload into
-- their own folder path, while admins retain full access.
DROP POLICY IF EXISTS "verification_insert" ON storage.objects;

CREATE POLICY "verification_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'landlord-verification-docs'
    AND (
      public.is_admin()
      OR auth.uid()::text = (storage.foldername(name))[1]
    )
  );
