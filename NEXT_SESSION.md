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

### Backfill the 321k unlinked records
321,590 of 406,940 records have `property_id IS NULL` because of the historical `ignoreDuplicates: true` upsert bug (fixed in 8 sync routes this session — won't affect new inserts). Most are NYC HPD (190k), NYC DOB (101k), nyc_marshals (~19k).

**Steps:**
1. Disable the counter trigger first: `ALTER TABLE public.public_records DISABLE TRIGGER trg_record_landlord_counts;` (without this, the trigger does an expensive COUNT subquery on every UPDATE → backfill times out).
2. Chunk per source in 5k batches via the address-match join (see migration 110 + earlier sync code for the per-source raw_data field names).
3. Re-enable trigger, run the one-shot count recompute from migration 107.

### Run "Run All Now" on /admin/data-sync
The 8 sync routes I patched (nyc-evictions, nyc-hpd, nyc-dob, nyc-registration, chicago, dallas, seattle, nashville) plus the shared `upsertRecords` helper now correctly resolve property IDs. Trigger them so the next-day cron doesn't have to wait until 03:00 UTC.

### Watch mine-violation-owners run for 3-4 nights
Daily at 01:00 UTC. With the new assessor-source coverage (17 assessors + HUD + PLUTO), it should populate `properties.landlord_id` for tens of thousands of properties — cascading 321k unlinked records into landlord-attributable ones via the trigger. If `records_updated` stays > 0 each run, the linkage flywheel is healthy.

### Fix the 13 broken city syncs
`/admin/data-sync` flags them with the "0 records — needs attention" pill. Each needs a current dataset ID from its city's open-data portal:
- Atlanta, Austin, Charlotte, Columbus, Dallas, DC, Denver, Detroit, Houston, Miami, Minneapolis, Nashville, Phoenix, Portland, Raleigh, Sacramento, San Antonio, San Jose, Seattle

Boston (commit `3a4a3cd`) is the canonical fix — probe `https://api.us.socrata.com/api/catalog/v1?domains=data.{city}.gov&q=violation+code+enforcement&limit=8`, drop the live ID into `KNOWN_IDS` in `lib/data-sync/{city}.ts`.

## P1 — Polish

- Address normalization parity. NYC HPD ingest produced ~30% mangled `address_normalized` ("AV ENUE", double spaces). New `normalizeAddress()` is consistent but legacy rows are stuck. Migration 113 candidate: re-run normalize on every property via a Postgres function.
- Lint cleanup: 33 unused-var warnings (mostly trivial), 145 explicit-any warnings (need typing pass for raw_data shapes per sync source).
- Property page lacks "Watch this property" button. Watchlist schema supports `property_id` already.
- /admin/audit needs filter-by-action_type dropdown.
- About page should pull stats from DB instead of static "values" copy.

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
