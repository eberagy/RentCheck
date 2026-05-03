# Vett — Next Session Punchlist

Last session ended at commit `bab1ad8` on 2026-05-01. 43 commits shipped that day. Live at vettrentals.com (Vercel `iad1`). All migrations deployed (105–112).

## 🚩 Blockers — set in Vercel env vars (no code change)

| Var | What it unlocks | Where to get it |
|---|---|---|
| `RESEND_API_KEY` | All transactional emails (welcome, watchlist, city alerts, digest, claim approved, review approved/rejected, etc.) — currently every send is a silent no-op | resend.com → API keys → create production key. Then verify the domain in Resend (SPF + DKIM DNS) |
| `NEXT_PUBLIC_SENTRY_DSN` | Production error tracking via `captureException()` calls scattered across the codebase | sentry.io → create new Next.js project → DSN |
| `NYC_OPEN_DATA_TOKEN` | Lifts the 1k req/day Socrata anon-tier rate limit on NYC HPD/DOB/marshal-evictions syncs | data.cityofnewyork.us → register app → copy App Token |

Verify after setting: `curl https://www.vettrentals.com/api/health | jq .env` — should show `true` for each.

## P0 — High-impact code work

### ✅ DONE 2026-05-02: Backfilled 321k unlinked records
All five major NYC sources are now 100% linked to property IDs (via direct
SQL backfill against the live DB; not a migration file because it's a
one-shot cleanup, not a schema change):

| source            | total   | linked  | pct  |
|-------------------|---------|---------|------|
| nyc_hpd           | 192,202 | 192,202 | 100% |
| nyc_dob           | 101,000 | 100,998 | 100% |
| nyc_marshals      |  24,590 |  24,590 | 100% |
| sf_housing        |   6,142 |   6,142 | 100% |
| chicago_buildings |  11,380 |  10,263 |  90% |

Process used: insert missing properties from each source's distinct
addresses (using migration 113's `normalize_address`), then chunked
UPDATE 5k records per call against `public.normalize_address(...)` join.
Counter trigger disabled before chunks, re-enabled after, then ran the
landlord aggregate recompute from migration 107. Result: landlords with
violations went from ~0 to 8,134; total attributable violations to 71,027.

### Run "Run All Now" on /admin/data-sync
The 8 sync routes patched on 2026-05-01 (nyc-evictions, nyc-hpd, nyc-dob,
nyc-registration, chicago, dallas, seattle, nashville) plus the shared
`upsertRecords` helper now correctly resolve property IDs on insert.
Trigger them so the next-day cron doesn't have to wait until 03:00 UTC.

### Watch mine-violation-owners run for 3-4 nights
Daily at 01:00 UTC. With the new assessor-source coverage (17 assessors +
HUD + PLUTO), it should populate `properties.landlord_id` for tens of
thousands of properties. Now that the 321k backfill is done, every
landlord_id update will cascade through the trigger and bump aggregate
counters live. If `records_updated` stays > 0 each run, the linkage
flywheel is healthy.

### Broken city syncs — root cause: Socrata sunset May 2025
Probe report from this session (commits a few back):

- **Migrated to ArcGIS Hub (Socrata redirect → /legacy):** Detroit,
  Minneapolis, Nashville, Raleigh, Sacramento, Charlotte, Portland.
  Sync code's hardcoded `/resource/{4x4}.json` IDs all redirect now.
  Fix: rewrite each to query an ArcGIS FeatureServer (pattern lives in
  `dc.ts` / `miami.ts` already, but those URLs ALSO drifted — needs
  rediscovery).
- **No public dataset:** Phoenix (`data.phoenix.gov` returns empty;
  `phoenixopendata.com` CKAN has no code-enforcement data at all). Disable.
- **DNS gone:** Charlotte (`opendata.charlottenc.gov`), Portland
  (`opendata.portland.gov`). Hosts no longer resolve.
- **Verified live this session (commit 27ac827):**
  - Austin: `6wtj-zbtb` (82,984 rows) — code wired, awaiting next cron
  - Seattle: `ez4a-iug7` (239,824 rows) — code wired, awaiting next cron
  - Dallas: `yvha-at84` (712,998 rows) — code wired, awaiting next cron

## P1 — Polish

- ✅ Address normalization parity (migration 113 — shipped, 43k properties backfilled).
- ✅ /admin/audit filter-by-action_type dropdown — shipped.
- ✅ Watch button on property page — shipped.
- ✅ About page pulls live stats from city_stats — shipped.
- ✅ Lint: unused-var warnings 58 → 0.
- Lint: explicit-any warnings still ~135 (10 dropped from search/route this session). Most are sync raw_data shapes — would benefit from a per-source row-type pass.

## P2 — Future features (deferred per user)

- Stripe integration (paid landlord verification + boost). Skipped per instruction.
- Native mobile app. Skipped per instruction.
- Public profile (/u/[id]) is shipped but no opt-ins yet.
- email_leads "subscribe to city without account" path doesn't have a no-auth unsubscribe — current `/unsubscribe` requires a signed token tied to a user_id.

## P3 — Engineering hygiene

- Add a `vitest` test framework + tests for `lib/safe-redirect.ts`, `lib/sanitize.ts`, `lib/data-sync/utils.ts`.
- Add CI typecheck + lint on PRs.
- Sentry release marker in deploy pipeline so traces tag the right commit.
- Verify `email_leads` RLS — should be service-role-only.

## Things to NOT change (explicit user decisions)

- Reviews default `is_anonymous = true` — privacy-first. Don't flip the default.
- Tagline: "Know before you rent." (exactly).
- Vett positions as "Glassdoor for Landlords" + "not a CRA" — FCRA notice prominent in records sections.
- Reviews must be lease-verified (no unverified reviews shown publicly).
- Don't fabricate landlord ↔ property links.

## How to resume

```bash
cd /Users/ragyebeid/vett
git pull origin main
pnpm install
pnpm typecheck   # should be clean
pnpm dev          # localhost:3000

# Live state
curl https://www.vettrentals.com/api/health | jq

# Sync log (Supabase Management API token in user memory)
```

Most recent commit: `bab1ad8`. See `~/.claude/projects/-Users-ragyebeid/memory/project_vett_session_2026_05_01.md` for the full inventory of what shipped this push.
