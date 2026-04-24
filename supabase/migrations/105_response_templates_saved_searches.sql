-- 2026-04-23 — response templates + saved city searches
-- Two feature tables. Additive.

CREATE TABLE IF NOT EXISTS public.response_templates (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id  UUID         NOT NULL REFERENCES public.landlords(id) ON DELETE CASCADE,
  created_by   UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  label        TEXT         NOT NULL CHECK (length(label) BETWEEN 1 AND 80),
  body         TEXT         NOT NULL CHECK (length(body) BETWEEN 1 AND 1000),
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_response_templates_landlord
  ON public.response_templates (landlord_id);

ALTER TABLE public.response_templates ENABLE ROW LEVEL SECURITY;

-- Only the verified claimant can see / write their landlord's templates.
DROP POLICY IF EXISTS "response_templates_owner_all" ON public.response_templates;
CREATE POLICY "response_templates_owner_all" ON public.response_templates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.landlords
      WHERE id = response_templates.landlord_id
        AND claimed_by = auth.uid()
        AND is_verified = true
    )
  );

-- Admins can see all templates (for abuse moderation)
DROP POLICY IF EXISTS "response_templates_admin_read" ON public.response_templates;
CREATE POLICY "response_templates_admin_read" ON public.response_templates
  FOR SELECT USING (public.is_admin());

-- ─── saved searches / city alerts ─────────────────────────────

CREATE TABLE IF NOT EXISTS public.saved_searches (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  city        TEXT         NOT NULL,
  state_abbr  TEXT         NOT NULL CHECK (length(state_abbr) = 2),
  notify_email BOOLEAN     NOT NULL DEFAULT true,
  last_notified_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  UNIQUE (user_id, city, state_abbr)
);

CREATE INDEX IF NOT EXISTS idx_saved_searches_user
  ON public.saved_searches (user_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_geo
  ON public.saved_searches (state_abbr, city);

ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "saved_searches_own" ON public.saved_searches;
CREATE POLICY "saved_searches_own" ON public.saved_searches
  FOR ALL USING (user_id = auth.uid());

COMMENT ON TABLE public.response_templates IS
  'Canned reply snippets owned by a verified landlord claimant.';
COMMENT ON TABLE public.saved_searches IS
  'City subscriptions. Cron /api/cron/saved-search-alerts sends weekly digest emails of new approved reviews in subscribed cities.';
