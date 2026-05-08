-- 2026-05-08 — Defense-in-depth uniqueness on review_flags.
-- The (review_id, flagged_by) dedup was application-only — see
-- app/api/flag/route.ts. A transient DB error on the dedup .single()
-- previously masqueraded as "no duplicate found" and let a single
-- user insert multiple flag rows for the same review. Combined with
-- the AUTO_HIDE_FLAG_THRESHOLD = 3 trigger in 007_triggers_functions,
-- that meant one bad-actor user could effectively hide any approved
-- review by re-flagging it during DB instability.
--
-- The application-side fix (commit log: flag.ts maybeSingle + dbError)
-- closes the race normally; this migration prevents it at the storage
-- layer so a future bug, RLS misconfig, or service-role caller can't
-- reopen it.

CREATE UNIQUE INDEX IF NOT EXISTS idx_review_flags_unique_user
  ON public.review_flags (review_id, flagged_by)
  WHERE flagged_by IS NOT NULL;

-- Note: WHERE clause keeps NULL flagged_by rows out of the index,
-- matching how Postgres treats partial-unique-NULL — flags with no
-- user (anon legacy rows) are still allowed to coexist.
