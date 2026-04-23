-- 2026-04-23 — Email leads (pre-launch city waitlist + marketing signup)
-- Purely additive. Safe to deploy live.

CREATE TABLE IF NOT EXISTS public.email_leads (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT        NOT NULL,
  source      TEXT        NOT NULL DEFAULT 'homepage',
  city        TEXT,
  state_abbr  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Dedup per source — one lead per (email, source) pair
  UNIQUE (email, source)
);

CREATE INDEX IF NOT EXISTS idx_email_leads_created_at
  ON public.email_leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_leads_source
  ON public.email_leads (source);

ALTER TABLE public.email_leads ENABLE ROW LEVEL SECURITY;

-- Admins can read everything
DROP POLICY IF EXISTS "email_leads_admin_read" ON public.email_leads;
CREATE POLICY "email_leads_admin_read" ON public.email_leads
  FOR SELECT USING (public.is_admin());

-- Anon inserts go through /api/email-leads (service role) — no direct anon insert policy.

COMMENT ON TABLE public.email_leads IS
  'Pre-launch / marketing email capture. Written by /api/email-leads using the service role.';
