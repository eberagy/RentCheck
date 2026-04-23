-- 2026-04-23 — Admin actions audit log
-- Purely additive. Safe to deploy live.

CREATE TABLE IF NOT EXISTS public.admin_actions (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id       UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  action_type    TEXT        NOT NULL,
  resource_type  TEXT,
  resource_id    UUID,
  subject_user_id UUID       REFERENCES public.profiles(id) ON DELETE SET NULL,
  detail         JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_actions_created_at
  ON public.admin_actions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_actions_admin_id
  ON public.admin_actions (admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_resource
  ON public.admin_actions (resource_type, resource_id);

ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

-- Admins can SELECT their own + others' log entries. Nobody else.
DROP POLICY IF EXISTS "admin_actions_admin_read" ON public.admin_actions;
CREATE POLICY "admin_actions_admin_read" ON public.admin_actions
  FOR SELECT USING (public.is_admin());

-- Inserts are service-role only (via lib/audit.ts). No policy for anon/authenticated.
-- Nobody can update/delete log entries; service role skips RLS.

COMMENT ON TABLE public.admin_actions IS
  'Append-only log of admin moderation actions. Written by lib/audit.ts#logAdminAction from admin API routes using the service role client.';
