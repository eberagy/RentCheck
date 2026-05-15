# Vett — Glassdoor for Landlords

Lease-verified renter reviews + public government records on landlords nationwide. Built for college-town distribution, growing nationwide.

## Stack

- **Framework**: Next.js 14 (App Router, ISR)
- **Database**: Supabase (PostgreSQL + Auth + Storage + RLS)
- **Hosting**: Vercel (with Vercel Cron Jobs)
- **Auth**: Google OAuth via Supabase Auth
- **Email**: Resend + React Email
- **Payments**: Stripe (scaffolded — Phase 2)
- **Analytics**: PostHog
- **Errors**: Sentry
- **UI**: shadcn/ui + Tailwind CSS

---

## Setup

### 1. Install dependencies

```bash
cd vett
pnpm install
```

### 2. Create Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. In the Supabase SQL Editor, run **every file** in `supabase/migrations/`
   in filename order (lexicographic — they're numbered `001_` through
   `117_` and growing). The Supabase CLI's `db push` does this for you;
   alternatively paste each file into the SQL Editor sequentially.

3. `supabase/seed.sql` intentionally ships with no fabricated sample landlords or records.
   Use the sync jobs below to populate real public data instead.

4. Create these **Storage buckets** in Supabase Storage:
   - `lease-docs` — **private**
   - `landlord-verification-docs` — **private**
   - `evidence-photos` — **private**
   - `avatars` — **public**

5. Enable **Google OAuth** in Supabase Auth → Providers → Google.
   - Set the redirect URL to: `https://YOUR-PROJECT.supabase.co/auth/v1/callback`

### 3. Environment variables

```bash
cp .env.example .env.local
```

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | From Supabase project settings |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | From Supabase project settings |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Server-only. Never expose client-side |
| `RESEND_API_KEY` | ✅ | From [resend.com](https://resend.com) |
| `CRON_SECRET` | ✅ | `openssl rand -hex 32` — secures sync endpoints |
| `NEXT_PUBLIC_SITE_URL` | ✅ | Your production URL (e.g. `https://vettrentals.com`) |
| `NEXT_PUBLIC_POSTHOG_KEY` | ⚡ | PostHog project API key |
| `NEXT_PUBLIC_POSTHOG_HOST` | ⚡ | Default: `https://app.posthog.com` |
| `NEXT_PUBLIC_SENTRY_DSN` | ⚡ | From Sentry project settings. Public-prefixed so the client SDK can init in the browser; the DSN is not a secret. |
| `NYC_OPEN_DATA_TOKEN` | ⚡ | [data.cityofnewyork.us](https://data.cityofnewyork.us) app token |
| `CHICAGO_DATA_TOKEN` | ⚡ | [data.cityofchicago.org](https://data.cityofchicago.org) app token |
| `SF_DATA_TOKEN` | ⚡ | [datasf.org](https://datasf.org) app token |
| `COURT_LISTENER_TOKEN` | ⚡ | [courtlistener.com](https://www.courtlistener.com) API token |
| `STRIPE_SECRET_KEY` | Phase 2 | Stripe secret key |
| `STRIPE_PUBLISHABLE_KEY` | Phase 2 | Stripe publishable key |
| `STRIPE_WEBHOOK_SECRET` | Phase 2 | Stripe webhook signing secret |

### 4. Run locally

```bash
pnpm dev
```

- App: `http://localhost:3000`
- Admin panel: `http://localhost:3000/admin` *(requires admin role — see below)*

### 5. Become admin

After signing in with Google, run in Supabase SQL Editor:

```sql
UPDATE public.profiles
SET user_type = 'admin'
WHERE email = 'your@email.com';
```

---

## Pages

| Route | Description |
|---|---|
| `/` | Homepage — search, stats, college city grid |
| `/search` | Full-text landlord + property search |
| `/landlord/[slug]` | Landlord profile (ISR 1h) — reviews, violations, properties |
| `/property/[id]` | Property page (ISR 1h) — violations, reviews |
| `/city/[state]/[city]` | City landing page |
| `/review/new` | 5-step review flow with mandatory lease verification |
| `/dashboard` | Renter dashboard — reviews, watchlist |
| `/landlord-portal` | Landlord dashboard — claim, respond to reviews |
| `/landlord-portal/claim` | Claim a landlord profile |
| `/rights/[state]` | Tenant rights guide by state (all 50) |
| `/about` | About Vett |
| `/faq` | FAQ |
| `/terms` | Terms of Service |
| `/privacy` | Privacy Policy |
| `/fcra-notice` | FCRA Notice |
| `/login` | Google OAuth sign-in |
| `/admin` | Admin dashboard |
| `/admin/reviews` | Review moderation queue |
| `/admin/leases` | Lease verification queue |
| `/admin/claims` | Landlord claim approvals |
| `/admin/disputes` | Record dispute resolution |
| `/admin/users` | User management |
| `/admin/data-sync` | Sync job status + manual triggers |

---

## Data Sync Jobs

~50 sync routes at `/api/sync/[source]` plus 5 internal crons
(`/api/cron/*`), all scheduled via `vercel.json`. Coverage spans
~25 cities + several county-level assessors, NYC HPD/DOB/marshal
evictions, CourtListener federal cases, HUD inspections, and rolling
city/landlord-watch maintenance jobs (`watchlist-alerts`,
`saved-search-alerts`, `refresh-city-stats`, `purge-leases`,
`admin-digest`).

See `vercel.json` for the full schedule. The live status of each
source is visible at `/admin/data-sync` (admin only) and aggregated
in the `public.sync_log` table — every run writes a row, so a
silently-broken source surfaces as a sustained `records_added=0`.

Manual trigger (admin only): `POST /api/sync/<source>` with the
`CRON_SECRET` header.

> **Note**: Vercel Pro is required (multiple crons + 300s function
> limit). Some sync routes legitimately run that long on a first
> backfill; subsequent ticks finish in under a minute.

---

## Legal Notes

- **Section 230**: User reviews protected under 47 U.S.C. § 230
- **FCRA**: Not a consumer reporting agency — platform prohibited for tenant screening; published reviews require lease verification
- **Fair Housing Act**: No protected-class data collected or displayed
- **Public records**: Sourced directly from government APIs, displayed as-is

---

## Deployment

1. Push to GitHub
2. Connect repo to [Vercel](https://vercel.com)
3. Add all environment variables in Vercel dashboard
4. Deploy — cron jobs activate automatically from `vercel.json`
