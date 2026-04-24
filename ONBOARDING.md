# Vett — Cofounder Bot Onboarding

**Last updated:** 2026-04-23
**Purpose:** Bring a cold Claude agent (no prior session memory) fully up to speed on Vett — the product, stack, compliance, live state, and the go-to-market plan. Read end to end before acting.

---

## 1. What Vett is (one paragraph)

Vett (domain: **vettrentals.com**, tagline: *"Know before you rent"*, positioning: *"Glassdoor for Landlords"*) is a nationwide web platform that combines three things renters can't get anywhere else: (1) **lease-verified renter reviews** of individual landlords and properties, (2) **public government records** (housing code violations, eviction filings, court cases, code enforcement), pulled daily from open-data sources, and (3) **landlord verification badges** that paying landlords can earn by claiming their profile and responding to reviews. We're building the renter-side trust layer for a $500B+ US rental market where renters currently fly blind.

Formerly called **RentCheck**. The GitHub repo still says `RentCheck` — don't rename it.

---

## 2. Team & roles (fill in before sending)

- **Ragy Ebeid** — founder, CEO, full-stack engineer, product. Email: rebeid3@jh.edu. Based in Baltimore. Johns Hopkins.
- **Kaleb** — [role TBD — fill in before onboarding bot]
- **Olson** — [role TBD — fill in before onboarding bot]
- **Ragy's Claude (this bot)** — acting as cofounder/CEO-of-everything with a GTM/marketing lean. Has memory across sessions via `/Users/ragyebeid/.claude/projects/-Users-ragyebeid/memory/`.

If you are Kaleb's or Olson's bot reading this cold: you do **not** have memory of prior sessions. Ask your principal (Kaleb or Olson) for their working notes and push important decisions back to them to save.

---

## 3. Mission & positioning

**Mission:** Level the playing field for renters. Make landlord reputation public, searchable, and verified — the way Glassdoor made employer reputation public.

**Positioning lines (in order of strength, use them):**
1. **"Glassdoor for Landlords"** — strongest, most legible. Currently buried in `/about` title tag. Promote it.
2. **"Know before you rent"** — tagline, good for social/video CTAs.
3. **"Lease-verified renter intelligence"** — the differentiator line. Our moat is that every review is backed by a real lease upload (hashed, deleted after 30 days).

**What we are NOT:**
- Not a Consumer Reporting Agency (FCRA — see §7). Never describe us as one.
- Not a rental listings site. We don't compete with Zillow/Apartments.com.
- Not a tenant-screening product for landlords — that's a phase-2 isolated product (§6).

---

## 4. Product

### User roles
1. **Renter (primary user, free)** — searches landlords by name or address, reads lease-verified reviews, sees public violation/eviction history, submits reviews with lease proof.
2. **Landlord (paying, $99/mo)** — claims their profile, responds to reviews, gets "Verified Landlord" badge, can dispute public records through a documented process.
3. **Admin (us)** — moderates reviews, approves landlord claims, handles disputes, manages data syncs.

### Core flows
- **Search** → landlord profile page → reviews + public records + grade.
- **Submit review** → Google OAuth → lease PDF upload → founder review → published.
- **Claim profile** → identity proof + ownership doc → admin approval → badge + respond-to-reviews capability.
- **Dispute public record** → submit dispute with docs → admin resolves (remove / update / no-action / refer).

### Surface (from live sitemap)
- 23 city pages at `/city/{state}/{city}` — Baltimore, Pittsburgh, State College, Philadelphia, NYC, Chicago, Boston, SF, LA, Austin, Seattle, Columbia, Conway, Houston, Miami, Denver, Atlanta, DC, Nashville, Dallas, Phoenix, Minneapolis, Portland.
- 19 state tenant-rights pages at `/rights/{state}` — MD, PA, SC, NY, CA, IL, TX, WA, MA, FL, GA, NC, VA, OH, MI, CO, AZ, NV, OR. (**The page copy currently lies and says "all 50 states" — fix.**)
- ~2,020 landlord profile pages in sitemap; 21,131 landlords scraped in total.
- Admin dashboard at `/admin` (8 pages — see §9).
- Footer: Terms, Privacy, **FCRA Notice**, "Not a CRA" disclaimer.

---

## 5. Tech stack & architecture

| Layer | Tool |
|---|---|
| Framework | Next.js 14 App Router, TypeScript strict |
| DB / Auth / Storage | Supabase (Postgres, Auth, Storage, Edge Functions, RLS on every table) |
| Hosting | Vercel (Pro — needs Cron) |
| Payments | Stripe (landlord $99/mo subscriptions) |
| Transactional email | Resend + React Email |
| Analytics / Monitoring | PostHog + Sentry |
| Insurance affiliate | Lemonade via Impact.com ($10–25 / converted policy) |
| Tenant screening (phase 2) | TransUnion SmartMove (FCRA-isolated) |
| UI | shadcn/ui + Tailwind, custom navy/teal brand |

### Environment
- Repo local: `/Users/ragyebeid/vett`
- GitHub: `https://github.com/eberagy/RentCheck` (do NOT rename)
- Git user: `eberagy`, email `rebeid3@jh.edu`, push via HTTPS PAT in macOS keychain
- Supabase project ref: `ktbssxoljehlhnsxllzo`
- Domain: `vettrentals.com` (DNS live, site serving)
- 65+ Vercel cron jobs driving 50+ data sync sources across 31+ cities

### Local dev
```bash
cd /Users/ragyebeid/vett
pnpm install
pnpm dev           # Next.js dev
pnpm typecheck     # must be clean before commit
pnpm lint          # warnings ok, errors not
pnpm build         # 57 routes should compile
```

### Credentials pattern
Secrets live in `.env.local` (git-ignored). Supabase management token, Stripe keys, Resend key, PostHog, Sentry, Google OAuth credentials. Ask Ragy for `.env.local` — never check secrets in.

---

## 6. Revenue model

Three streams, sequenced deliberately:

1. **Landlord $99/mo Verified Badge** (Stripe subscription). Claim + respond + show badge. **Don't launch until review density is embarrassing to landlords** — that's the leverage. Target activation: month 4.
2. **Renters insurance affiliate** (Lemonade via Impact.com). $10–25 per converted policy. Zero friction, show on every review confirmation. Target activation: month 2.
3. **Tenant screening markup** (TransUnion SmartMove). $35–45/report. **Must be completely isolated** — different UI, different routes, different DB table — to stay FCRA-compliant (§7). Target: month 6+.

---

## 7. Compliance — HARD RULES (do not break)

These are non-negotiable. Every feature proposal must be checked against them.

### FCRA (Fair Credit Reporting Act)
- Vett is **NOT a consumer reporting agency**. Full disclaimer on every landlord profile page and in the footer.
- Never make editorialized claims ("this is a bad landlord"). Only surface raw data + user-submitted reviews.
- Grade labels must be neutral ("Summary of public renter reviews. Not from a consumer reporting agency"), never "Excellent" / "Significant concerns" / similar. We removed editorial grade descriptions on 2026-04-22 — don't add them back.
- The TransUnion screening product must be **isolated** — separate UI/routes/tables from the review product.

### Section 230 (CDA immunity on user content)
- Never edit or editorialize user reviews.
- Sort order = date or helpfulness only. Never sort by "worst" or "best."
- Documented takedown process must exist and be followed.
- We removed "Most flagged landlords" city-page ranking on 2026-04-22 — don't add back.

### Fair Housing Act
- Rating categories are ONLY: **responsiveness, maintenance, honesty, communication**.
- **Never** rate or categorize by neighborhood, demographics, or protected-class-adjacent dimensions.

### Lease document handling
- Uploaded lease PDFs → SHA-256 hash stored → keyword check → **deleted after 30 days**.
- Never exposed via public API.
- Signed URLs only, time-limited, admin-only.

### No fake data
- Never fabricate ownership links between landlords and properties or records. Only link when we have verified ownership proof (e.g., HPD NYC registration data matches corporate owner → registration → violations). For cities without ownership data in raw records, records stay unlinked until landlord claims + verifies.

### Incentivized reviews (FTC 16 CFR 465 + 255, effective Oct 21 2024)
- CANNOT condition any incentive on a positive review, star rating, or sentiment.
- CAN offer gift card / sweepstakes / charity donation for "honest review, positive or negative."
- MUST attach an "Incentivized Review" badge to any review we paid or raffled for.

---

## 8. Current live state (2026-04-23 snapshot)

### What works
- Full Supabase schema + RLS deployed
- 21k+ landlords scraped, 2k+ landlord profile pages indexed
- 23 city pages + 19 state tenant-rights pages live
- Admin dashboard (8 pages) functional
- XSS sanitization (`lib/sanitize.ts`), rate limiting (`lib/rate-limit.ts`), ban enforcement in middleware + user-facing APIs
- Transactional emails: response-approved, response-rejected, claim-rejected, submission-rejected (React Email)
- Google OAuth signup
- Lease upload → verify → publish pipeline
- FCRA-compliant disclaimers everywhere
- `pnpm typecheck`, `pnpm lint`, `pnpm build` all clean as of commit `61b292b`

### What's broken / missing (the Phase 0 list — fix before any traffic push)
1. `/how-it-works` → **404** (homepage funnel needs it)
2. `/pricing` → **404** (revenue model invisible to marketers)
3. `/cities/*` → **404** (only `/city/*` works — inbound links will break; add redirect)
4. `/rights` copy claims "all 50 states" but only 19 exist — **credibility risk**
5. Homepage has 3 competing hero CTAs ("Search" / "Write a review" / "Add a landlord") with no primary
6. No social proof above fold (no review counts, testimonials, press)
7. No email capture, no "notify me when my city launches" form, no referral program
8. No visible signup (gated inside review flow as Google OAuth only)
9. Most city pages outside NYC are ghost towns — "No lease-verified reviews published yet"
10. Homepage title has duplicated `Vett`: `Vett — Know Before You Rent | Vett`
11. Stripe landlord-badge subscription flow not wired up
12. Individual review permalinks not in sitemap (big SEO miss)

### Not done on purpose (scope decisions, don't touch without permission)
- Other pages flagged for SSR bail-out (login, dashboard, landlord-portal, dispute, add-landlord, review/new) are auth-gated or form-heavy — client rendering is fine, no SEO/social preview needed.
- `landlord.grade` Postgres composite (`compute_landlord_grade`) stays until we need stricter FCRA posture.
- "Top-rated landlords" section kept — sorting user-generated reviews by avg rating is industry standard.

---

## 9. Admin dashboard (`/admin`)

Eight pages, all functional:
- `/admin` — live stats, queue counts, pending previews, data health
- `/admin/reviews` — moderation queue (approve/reject, lease-verification check)
- `/admin/leases` — lease doc verification (signed URLs, verify/reject)
- `/admin/claims` — landlord profile claim requests
- `/admin/disputes` — public-record dispute resolution (remove/update/no-action/refer)
- `/admin/submissions` — community-submitted landlord profiles (approve/reject/duplicate)
- `/admin/users` — user management (search, ban/unban, promote)
- `/admin/data-sync` — 50+ sync sources with run history, manual trigger, run-all
- `/admin/responses`, `/admin/flags` — landlord response moderation, content flags

---

## 10. Competitive landscape

| Competitor | Size | Positioning | Weakness we exploit |
|---|---|---|---|
| **Openigloo** | 1.5M NYC users, now ATL/CHI/MIA | NYC-native finder + reviews + HPD data | Thin outside Tier-1 cities; no landlord-badge revenue |
| **WhoseYourLandlord** | 330K users, 22K landlords, $2.1M seed (2022) | Nationwide reviews + neighborhood content | 8+ yrs to build — only 88 landlords/city on avg; stale blog; weak SEO |
| **RateMyLandlord.com** | Dormant | Legacy domain owns the keyword | Product-dead — out-rank or acquire |
| **NYC Worst Landlord Watchlist** | Govt, NYC-only | Authoritative static yearly list | Ugly UI, NYC-only — syndicate, don't compete |
| **Reddit (r/LandlordLove, r/Renters, r/Apartments)** | Millions | De facto review channel | This is distribution, not competition — show up there |

---

## 11. SEO wedge (high-intent, low-comp)

- `"[landlord LLC name] reviews"` — almost no one ranks; LLC names from deed records = programmatic goldmine.
- `"[street address] reviews"` / `"is [address] a good apartment"` — Openigloo partially owns NYC, nobody else.
- `"[city] worst landlords 2026"` — WYL publishes nothing, RateTheLandlord weak.
- `"how to check a landlord before renting"` — informational top-funnel, dominated by Reddit and random blogs.
- `"[state] tenant rights"`, `"[state] security deposit law"` — current rankers (DoorLoop, Nolo, AAOA) are all landlord-side. Vett can win tenant-side framing.

**Programmatic pillars to build:** 50 state tenant-rights hubs, ~500 city hubs, millions of address pages, ~100K LLC/landlord pages.

---

## 12. GTM plan — **tri-campus wedge** (decided 2026-04-22)

### Strategy
Own three clustered college towns in neighboring states before going broad:
- **Johns Hopkins (Baltimore, MD)** — Charles Village / Remington / Hampden / Waverly / Mt. Vernon
- **Pitt (Pittsburgh, PA)** — Oakland (N/S/Central) / Shadyside / Squirrel Hill / Bloomfield
- **Penn State (State College, PA)** — Downtown / Highlands / Beaver Canyon / Vairo Village

Why these three: all have data in the system, geographically clustered (one tri-state press narrative), brutal off-campus rental markets with established slumlord reputations (Oakland especially), and students have massively higher lease turnover than general population = more reviews per user.

### Why not one city
College rental markets are concentrated in 5–15 neighborhoods per campus. Three campuses ≈ 30–45 neighborhoods — still a tight wedge, and one op-ed cycle across three student papers + three city papers = shared press lift.

### The critical deadline
**August 2026 move-in week** is our launch window at all three schools. Back-planning:
- **May–June 2026:** Phase 0 code fixes, Baltimore seed
- **July 2026:** Three-campus launch, RA/ambassador programs live, student newspaper op-eds submitted
- **August–September 2026:** Ride move-in traffic + horror-story content to viral

### Phase-by-phase

#### Phase 0 (Week 1, now): Unblock
Ship the 12 Phase 0 fixes (§8). Until they're done, do not send a single user to the site.

#### Phase 1 (Weeks 2–3): First 100 reviews per campus (300 total)
Pre-seed density in each city. Cold-supply tactics ranked by ROI:
1. **Founder cold DM sprint** — 500 DMs/week on Reddit, Instagram, TikTok comments on "bad landlord [city]" posts. Offer: $20 Venmo + Founding 500 badge + $500 raffle entry for an honest lease-verified review. Disclose as "Incentivized Review."
2. **Housing-nonprofit partnerships** — $5/verified review donated (Fair Housing Action Center Baltimore, Just Harvest Pittsburgh, Tenants Union of PA). Converts ~2x cash, FTC-clean, press-friendly.
3. **Tenant-lawyer seeding** — 5–10 lawyers per city with war-story clients. Offer "Verified Advocate" profile + free badge-checks. They route clients.
4. **Personal network** — Ragy + cofounders + friends/family with real lease proof. Target 20 before any outside push.

**Budget:** ~$3K ($20 × 100 × 1.5 uptake adjustment for badge-swap).

#### Phase 2 (Weeks 4–6): First 1,000 signups
- **Content engine:** reuse `/Users/ragyebeid/vett-video-marketing` — 2 videos/day + 1 carousel/day across TikTok/Reels, campus-tagged. Hook formula: "The worst landlord in [campus neighborhood] has [N] open violations." Text-overlay CTA (+152% vs voice-only). Every video → dedicated `/schools/[slug]` or `/nightmare` landing.
- **Reddit organic:** value-first answers in r/jhu, r/Pitt, r/PennStateUniversity, r/baltimore, r/pittsburgh, r/StateCollege, r/LandlordLove, r/Renters. Soft link once per 3 helpful answers.
- **Programmatic SEO unlock:** ship individual-review permalinks, `/[city]/worst-landlords` pages (ordered by verified violation count only — FCRA-safe), and 19 × 2 = 38 `/rights/[state]/security-deposit` + `/rights/[state]/eviction` sub-pages.
- **Incentive loop live:** $500/mo Amazon raffle, Founding 500 capped badge with countdown, Morning Brew-style referral ladder (3 → unlock full risk scores, 10 → Verified Renter badge + sticker, 25 → hoodie, 50 → free lease review by partner lawyer).

#### Phase 3 (Months 2–3): First 10,000 signups
- **Off-Campus Housing Office deals** (Handshake "Ford Focus" model): free data license → Vett link on their housing portal.
- **RA / Greek ambassadors:** $3 per verified-review signup, $200/mo cap per chapter ($600/mo total across three campuses).
- **Student newspaper op-eds** (founder-bylined, one per paper): Hopkins News-Letter, The Pitt News, The Daily Collegian.
- **Press launches:**
  - **Product Hunt:** Tuesday, 12:01am PT. Tagline under 60 chars: "Check your landlord before you sign." Prep 30 days + 50 hunters queued.
  - **Show HN:** "Show HN: I scraped 847k court records and built a Glassdoor for landlords." Data-first, not product-first.
  - **Local TV:** WBAL (Baltimore), KDKA (Pittsburgh), WJAC/CDT (Centre County). Consumer-protection pitch + ready-to-air data viz.
  - **Tri-state housing press:** Baltimore Banner, Pittsburgh Post-Gazette, Centre Daily Times, Billy Penn, The Real Deal, Inman, Shelterforce.
- **Ride 2026 PR hooks:** NYC Mamdani rent-freeze cycle, CA AB 1157, Fed H.R. 206 Landlord Accountability Act, Somerville 90% rent-hike jury trial, MN rent strike. Publish a live **"Vett Tenant Protection Index"** (state-by-state scorecard) as recurring linkbait.

### Revenue activation sequencing
- **Month 2:** Lemonade renters-insurance affiliate live on every review confirmation page. Free money.
- **Month 3:** Landlord "Claim & Respond" free flow — builds pipeline of claimed landlords.
- **Month 4:** $99/mo Stripe Verified Badge live, target claimed landlords first.
- **Month 6+:** TransUnion SmartMove tenant screening — separate isolated product, needs compliance review before launch.

---

## 13. Sibling repo: video marketing pipeline

**Location:** `/Users/ragyebeid/vett-video-marketing/` (separate git repo).

**What it does:** auto-generates and posts social content for Vett. Fiction is OK for v1 (Ragy explicitly approved — sidesteps defamation risk).

**Pipeline (~$0.002/video):**
Claude Haiku script → edge-tts (free narration) → Pollinations.ai (free AI images) → Pixabay (free music) → FFmpeg assembly with karaoke captions + hook overlay + Vett CTA end card → Late API post to TikTok/IG Reels/YT Shorts.

**Accounts ("Worth Watching" brand, Ragy's):**
- IG `@thekidscool12`
- TikTok `@worth.watching2`
- YouTube `@worthwatchingrn`

**10 content categories** in `src/content-strategy.ts`: horror-story, landlord-types, red-flags, expectation-reality, landlord-translator, security-deposit, lease-fine-print, roommate-landlord, maintenance-request, moving-day.

**Every output ends with Vett branding + vettrentals.com CTA.**

**Related reusable skills repo:** `/Users/ragyebeid/Social Media AI Manager/` has `.claude/skills/carousel-generator`, `.claude/skills/late-social-media`, `.claude/skills/document-carousel`, plus 68 Remotion components / 22 compositions. Reuse, don't rebuild.

---

## 14. Glossary / internal aliases

| Term | Meaning |
|---|---|
| **Vett** | Product. Formerly RentCheck. |
| **RentCheck** | Old name. Only survives in GitHub repo URL — don't rename. |
| **Zernio** | Ragy's alias for **Late** (`getlate.dev`). Don't WebSearch "Zernio." |
| **Founding 500** | Permanent scarcity badge — first 500 lease-verified reviewers. |
| **Verified Badge** | Landlord paid-tier ($99/mo) — claim + respond + badge on profile. |
| **Worth Watching** | Ragy's social-media brand used for Vett content (IG/TikTok/YT). |
| **Late** | Social-media posting API we use. Not the same as "Late" any other sense. |

---

## 15. How we communicate & ship

- **Commit to `main` often, push to GitHub as milestones land.** No long-lived branches.
- **Prefer shipping over planning.** Phase 0 is done by code, not docs.
- **Concise communication.** Ragy wants terse responses — no summaries at the end of every message, no emoji unless he uses them first.
- **Verify before claiming success.** `pnpm typecheck && pnpm lint && pnpm build` all clean before you say "shipped."
- **Ask before destructive actions.** Dropping tables, force-pushing, deleting branches → always confirm.
- **Never fabricate ownership links** between landlords and properties/records (see §7). Unlinked stays unlinked.
- **Memory lives at** `/Users/ragyebeid/.claude/projects/-Users-ragyebeid/memory/` for Ragy's bot. Kaleb/Olson bots have their own or none — err on the side of pushing decisions back to humans to save.

---

## 16. Pending decisions / open questions

1. **Phase 0 fix order** — ship hero CTA + `/how-it-works` + `/pricing` first, or redirect + "50 states" fix first? (Ragy leaning first group.)
2. **First seeded campus** — Ragy + Claude are 60/40 on **Pitt-Oakland first** (viral-ready slumlord stories, Pitt News rental-crisis beat, big Greek scene). Decision pending.
3. **Incentive mix** — $500/mo Amazon raffle + $5/review charity donation, or pure $20 Venmo per review, or both? Budget TBD.
4. **Stripe timing** — current memory says "leave for last." Plan targets month 4 activation.
5. **Kaleb / Olson role split** — not captured here. Fill in before handing this doc to their bots.
6. **Agency vs in-house for PR launch** — no budget decision yet.

---

## 17. Quick start for a new Claude bot

If you're reading this cold:

1. **Read this whole doc.** Don't skim §7 (compliance).
2. **Clone the repo if you need code access:** `cd /Users/ragyebeid/vett && pnpm install`.
3. **Look at the live site:** `https://vettrentals.com` — home, `/about`, `/faq`, `/search`, one city (`/city/md/baltimore`), one state (`/rights/pa`).
4. **Read these memory files if Ragy's bot is your principal:**
   - `/Users/ragyebeid/.claude/projects/-Users-ragyebeid/memory/project_rentcheck.md`
   - `/Users/ragyebeid/.claude/projects/-Users-ragyebeid/memory/project_vett_gtm.md`
   - `/Users/ragyebeid/.claude/projects/-Users-ragyebeid/memory/project_vett_site_state_2026_04_22.md`
   - `/Users/ragyebeid/.claude/projects/-Users-ragyebeid/memory/project_vett_session_2026_04_22.md`
5. **Don't break the hard rules in §7.** Every feature check goes through FCRA / Section 230 / FHA.
6. **Default actions you can take without asking:** reading code, running `pnpm typecheck/lint/build`, drafting copy, proposing plans, running local data queries.
7. **Actions that need Ragy's approval first:** pushing to `main`, opening PRs, sending real emails, posting to Vett's social accounts, spending incentive budget, changing DB schema, modifying Stripe config, changing FCRA disclaimer copy.

---

## Appendix A — Key file paths

- **Product repo:** `/Users/ragyebeid/vett`
- **Video marketing repo:** `/Users/ragyebeid/vett-video-marketing`
- **Reusable social skills:** `/Users/ragyebeid/Social Media AI Manager`
- **Sanitize lib:** `vett/lib/sanitize.ts`
- **Rate limit lib:** `vett/lib/rate-limit.ts`
- **Landlord grade component:** `vett/components/LandlordGrade.tsx` (do NOT re-add editorial descriptions)
- **City page template:** `vett/app/(main)/city/[state]/[city]/page.tsx`
- **State rights page:** `vett/app/(main)/rights/[state]/page.tsx`
- **Review submit:** `vett/app/(main)/review/new/page.tsx`
- **Admin:** `vett/app/(admin)/admin/*`

## Appendix B — Last known-good commit

`61b292b` on `main`. `pnpm typecheck` clean, `pnpm lint` clean (warnings only), `pnpm build` clean across 57 routes.

## Appendix C — Regulatory / PR hooks live in 2026

- NYC Mamdani "Freeze the Rent" (ongoing)
- CA AB 1157 (2% + inflation cap, 5% max) resurfaced 2026
- Fed H.R. 206 Landlord Accountability Act (2025)
- Somerville 90% rent-hike eviction jury trial
- CT eviction reform 2026 session
- MN rent strike push (10k target)
- Just-cause eviction + right-to-counsel spreading city-by-city

## Appendix D — Hard numbers to remember

- 21,131 landlords tracked
- ~2,020 landlord profile pages indexed
- 23 cities, 19 states live
- $99/mo landlord badge price
- $10–25 per Lemonade insurance conversion
- $35–45 per TransUnion screening report
- Target: 100 reviews per campus by end of Phase 1 (300 total)
- Target: 1,000 signups by end of Phase 2
- Target: 10,000 signups by end of Phase 3
- Budget Phase 1: ~$3K
- Drop-dead launch date: August 2026 move-in week
