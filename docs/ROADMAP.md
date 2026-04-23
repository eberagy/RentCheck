# Vett Roadmap

Living document. Source of truth for what's built, what's next, what's research, and what's deferred. Last updated 2026-04-23.

## Status snapshot

- **Live at** vettrentals.com, 23 cities, ~21k landlords, ~180k public records
- **Stack** Next.js 14 App Router, Supabase (Postgres + Auth + Storage + RLS), Resend, Stripe (scaffold), PostHog, Sentry
- **Moderation queues** fully wired with email notifications at submission + resolution
- **Admin digest cron** fires daily at 13:00 UTC
- **Known hold** Stripe checkout + webhook are TODO by user request

## Near-term queue (ranked by shippable value / week)

### Now (this session)
1. Review edit + delete for pending reviews
2. Response rate chip on landlord cards (spread from profile)
3. Dedicated `/dashboard/watchlist` page
4. Admin actions audit log (compliance + accountability)
5. Account delete + data export (CCPA / GDPR scaffolding)
6. Dedicated `/dashboard/reviews` page with filters
7. Lease doc 30-day deletion cron (compliance)

### Week 1 — post-launch polish
- Search: saved-search alerts (subscribe to `city + filters`, weekly email)
- Landlord portal: response templates (save canned responses)
- Landlord portal: weekly landlord digest email (new reviews on your properties)
- Admin: bulk action on moderation queues
- Admin: analytics dashboard (time-to-moderate, approval ratio)
- Admin: free-text notes on users
- SEO: tenant-rights scenario pages (`/rights/california/security-deposit`)
- SEO: unique content variant for thin landlord pages
- Email: per-category unsubscribe page (granular)

### Week 2 — engagement features
- Public renter profile at `/u/[handle]` with privacy toggle
- Review photos upload (medium scope)
- Flag escalation: >N flags on one review auto-hide pending moderation
- Keyword block list for obvious slur/hate terms on submission
- Landlord photo/logo upload
- Landlord description field (needs migration)
- Review rating histogram on landlord profile

### Week 3 — growth surface
- Blog infra (`/blog/[slug]` MDX-backed)
- Location-specific landing pages (`/research/[city]`)
- Competitor comparison pages (`/vs/openigloo`, `/vs/whose-your-landlord`)
- Referral mechanics (invite link credits)
- City comparison tool (`/compare-cities`)
- Press kit page (`/press`)
- RSS feed per city (`/feed/city/[slug].rss`)
- Open-graph image generator per landlord (dynamic `/api/og/landlord/[slug]`)

### Month 2 — platform
- Stripe checkout + webhook (user-held)
- Tiered landlord plans (Verified $99/mo, Pro $299/mo)
- Stripe Customer Portal for billing self-service
- Public API (`/api/v1/*`) with API keys + per-partner rate limits
- Usage metering for API tiers

### Ongoing — data quality
- Landlord merge UI (admin) for duplicates
- Name normalization cron (strip "LLC"/"INC" for display)
- Deduplication cron (fuzzy match near-duplicates)
- Data source quality dashboard (freshness + success rate per source)
- Property → landlord relink UI

### Legal / compliance backlog
- Terms of service versioning (track which ToS version each user accepted)
- Review anonymization option (strip reviewer name after N months)
- Cookie consent banner (EU users)
- PostHog EU region config
- Audit trail on `public_records` deletions (admin activity log — already planned)
- Age gating if we ever drop below 18
- Account deletion flow — ships this session

## Infrastructure health check (outside repo)

These affect product behavior but aren't code:

- [ ] Resend domain verification — SPF/DKIM records on vettrentals.com. If not done, no emails deliver.
- [ ] Resend env vars — `RESEND_API_KEY`, `RESEND_FROM_EMAIL` in Vercel.
- [ ] `CRON_SECRET` in Vercel — required for all cron jobs to pass auth.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` in Vercel.
- [ ] Supabase storage bucket policies for `lease-docs` and `landlord-verification-docs`.
- [ ] Supabase Auth email templates (signup confirmation, password reset) — these are separate from our Resend templates.
- [ ] Sentry DSN in Vercel.
- [ ] PostHog project key in Vercel.
- [ ] Vercel Pro plan (required for the 60+ crons in vercel.json).
- [ ] DNS records for marketing subdomains if you want `blog.vettrentals.com`.

## Research queue

### In flight (agent-backed, 2026-04-23)
- Competitor teardown (Openigloo, WhoseYourLandlord, ApartmentRatings, Glassdoor comparables)
- Deep security + legal audit
- SEO + growth audit

### Ideas to commission
- User interview recruitment (5 renters + 3 landlords)
- Top 10 college cities rent-scam data crawl
- Tenant-advocacy partnership list (legal aid societies by state)
- PR hooks calendar (eviction moratoria anniversaries, housing bills)
- FCRA / state-law variance matrix for landlord-review platforms
- FTC 2024 review endorsement guidelines applicability

## Architecture notes (so we don't rediscover these)

- **PostHogProvider** must isolate `useSearchParams` in its own inner `<Suspense>` — otherwise every page BAILOUTs to CSR and loses SSR (both SEO and status codes).
- **RLS silent-failure pattern**: client-side `.update()`/`.delete()` that hits RLS returns `{ error: null, data: [] }` — failures are invisible. Always route admin + cross-owner writes through service-role API routes.
- **ScrollReveal** must render visible on SSR and only hide below-fold elements client-side, else crawlers see empty pages.
- **AnimatedCounter** must render `target` on SSR initial state, not 0, for the same reason.
- **`landlord.grade`** (Postgres trigger `compute_landlord_grade`) is computed but NOT surfaced anywhere — keeping FCRA posture clean. Do not re-SELECT it in API responses.
- **Stat grids rule** — user preference: always show all dimensions, render zeros in muted slate-300. Don't conditionally hide. (See `feedback_vett_stat_cards.md` in memory.)

## Killable / deferred ideas

Parked because the juice isn't worth the squeeze at current scale:
- AI review summary per landlord (hallucination risk, high cost per page, FCRA risk)
- ML abuse detection (rules-based + flag-threshold is fine until volume warrants)
- Native mobile app (web + PWA is enough; native is multi-month)
- Video reviews (UGC moderation burden too high)
- Public API with aggressive pricing (premature — build demand first)
- Forum / discussion threads (moderation burden, not our core value)

## Key decisions (don't reopen unless new data)

- Lease-verified only. No unverified reviews. Trust moat over scale.
- Not a CRA. FCRA disclaimer everywhere. No composite "grade" surfacing to clients.
- Sort reviews only by date/helpfulness. No editorial ranking that could erode Section 230.
- Admin-granted verified status on claim approval (no Stripe gate yet).
- College town seeding priority (Baltimore, State College, Pittsburgh, etc.).
- Response rate chip only at ≥3 approved reviews (sample-size honesty).

---

## Recently shipped (2026-04-22 → 2026-04-23)

Architecture
- Unlocked site-wide SSR (PostHogProvider suspense fix)
- RLS silent-failure class across 7 admin + landlord endpoints (service-role API routes)
- Stripped `landlord.grade` composite from all client surfaces (FCRA)
- AnimatedCounter + ScrollReveal SSR corrections
- PageSpeed fixes via next/script for JSON-LD

Email paths
- Submission acknowledgment emails (review, landlord, claim, dispute, response)
- Welcome email on first signup
- Dispute resolution email (with decision-specific copy)
- Admin daily digest cron
- All approval/rejection emails (response, claim, submission variants)
- `/unsubscribe` route wired into every email footer

Integration fixes
- Claim approval now promotes `profiles.user_type` to 'landlord'
- Admin digest counts `record_disputes` with `status='open'` (was `'pending'`)
- Middleware redirects banned users on /review/new, /add-landlord, /dispute
- Dispute decision enum alignment (`refer_to_source`)
- Landlord portal "Open disputes" now queries real data

UX / UI
- Stat grids always show zeros (muted), per user preference
- Rating breakdown section always visible with em-dash for nulls
- "Has open violations" search facet
- Response rate chip on landlord profile
- Landlord profile edit (website + phone) for verified claimants
- Dashboard watchlist empty-state CTA
- Dropdown + Select background transparency fixes

Security + ops
- /api/admin/promote-user, moderate-flag, resolve-dispute, verify-lease (service-role)
- /api/landlord-response, /api/landlord-profile (service-role)
- Sentry wrapper wired into client error paths (reviews, add-landlord, claim)
- /unsubscribe page (CAN-SPAM)

### Shipped overnight 2026-04-23

Autonomous heartbeat session (10-minute cadence). Every commit on `main`.

- `6991185` Admin actions audit log (migration 100, `lib/audit.ts`, instrumented 9 admin routes, `/admin/audit` page, AdminNav link)
- `ab06633` CCPA/GDPR self-serve — `/api/me/export` JSON data dump, `/api/me/delete` purges storage + profile + anonymizes reviews. Settings UI rebuilt.
- `c35fde4` Lease-doc 30-day deletion cron at `/api/cron/purge-leases` (daily 04:00 UTC), honors the public retention commitment
- `7d8bdb7` Dynamic per-landlord OG image via `ImageResponse` (1200x630 with rating/count/violations/verified badge)
- `1051f79` Per-city dynamic OG image + CAN-SPAM shared `EmailFooter` component (postal address + unsubscribe) rolled into 7 legacy templates
- `e25f1c8` Content safety: `lib/content-filter.ts` auto-flags slur/doxxing/threat patterns on submit; 3-flag distinct-user escalation auto-hides from public feed
- `401d102` IDOR fix on `/api/admin/lease-url` (reviewId-gated, lease access now logged to audit trail) + rate limits on 5 previously unlimited endpoints (verify-lease, landlord-response, landlord-profile, watchlist POST, search)
- `0c42efa` Newsletter / city-waitlist signup (migration 101 email_leads + `/api/email-leads` + `NewsletterSignup` component mounted on homepage)

### Final batch (user said "just do them all now")
- `8b657d9` Admin bulk moderation on review queue (checkboxes + select-all + Approve/Reject toolbar)
- `4217728` Security M3: sanitizeText upgraded from regex to `sanitize-html` (Node-native, no JSDOM)
- `a130369` Response-rate chip on LandlordCard (migration 102 + trigger extension + backfill)
- `ab7f88f` Blog infra + tenant-rights scenario pages (5 scenarios × 19 states prerendered) + middleware-level CSRF/origin check + token-signed unsubscribe + `/admin/analytics`

Migrations deployed live to prod (2026-04-23):
- ✅ `supabase/migrations/100_admin_actions_log.sql` — admin_actions table wired; audit trail starts populating as soon as admins take actions
- ✅ `supabase/migrations/101_email_leads.sql` — email_leads table + RLS live; homepage signup form now stores leads
- ✅ `supabase/migrations/102_landlord_response_rate.sql` — response_rate + responded_review_count columns + trigger extension + backfill (0 landlords currently have a rate — need ≥3 approved reviews to unlock)

Still pending — needs deeper engineering before deploy:
- ⚠️ `supabase/migrations/099_security_rls_tightening.sql` — the column-level REVOKE/GRANTs would break `select('*')` on landlords (compare page) + self-profile reads in dashboard/landlord-portal/settings (authenticated users need full own-row read). The critical anon-email-leak is already closed at the API-boundary layer (`PUBLIC_REVIEW_SELECT` drops email, GET /api/reviews uses explicit column lists), so this migration is defense-in-depth not a ship-blocker. Next pass: introduce a `public_profiles` view + update PostgREST embeds to reference it.

See `project_vett_session_2026_04_22.md` and `project_vett_heartbeat.md` in memory for full per-commit breakdowns.
