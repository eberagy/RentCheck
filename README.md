# RentCheck — Glassdoor for Landlords

Verified renter reviews + public government records on landlords nationwide. Built for college-town distribution, growing nationwide.

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
cd rentcheck
npm install
```

### 2. Create Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. In the Supabase SQL Editor, run each migration file **in order**:

```
supabase/migrations/001_core_tables.sql
supabase/migrations/002_reviews.sql
supabase/migrations/003_public_records.sql
supabase/migrations/004_supporting_tables.sql
supabase/migrations/005_rls_policies.sql
supabase/migrations/006_search_and_fts.sql
supabase/migrations/007_triggers_functions.sql
supabase/migrations/008_admin_columns.sql
supabase/migrations/009_helper_functions.sql
```

3. (Optional) Run `supabase/seed.sql` to populate sample landlords.

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
| `NEXT_PUBLIC_SITE_URL` | ✅ | Your production URL (e.g. `https://rentcheck.app`) |
| `NEXT_PUBLIC_POSTHOG_KEY` | ⚡ | PostHog project API key |
| `NEXT_PUBLIC_POSTHOG_HOST` | ⚡ | Default: `https://app.posthog.com` |
| `SENTRY_DSN` | ⚡ | From Sentry project settings |
| `NYC_OPEN_DATA_TOKEN` | ⚡ | [data.cityofnewyork.us](https://data.cityofnewyork.us) app token |
| `CHICAGO_DATA_TOKEN` | ⚡ | [data.cityofchicago.org](https://data.cityofchicago.org) app token |
| `SF_DATA_TOKEN` | ⚡ | [datasf.org](https://datasf.org) app token |
| `COURT_LISTENER_TOKEN` | ⚡ | [courtlistener.com](https://www.courtlistener.com) API token |
| `STRIPE_SECRET_KEY` | Phase 2 | Stripe secret key |
| `STRIPE_PUBLISHABLE_KEY` | Phase 2 | Stripe publishable key |
| `STRIPE_WEBHOOK_SECRET` | Phase 2 | Stripe webhook signing secret |

### 4. Run locally

```bash
npm run dev
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
| `/review/new` | 5-step review flow with lease upload |
| `/dashboard` | Renter dashboard — reviews, watchlist |
| `/landlord-portal` | Landlord dashboard — claim, respond to reviews |
| `/landlord-portal/claim` | Claim a landlord profile |
| `/rights/[state]` | Tenant rights guide by state (all 50) |
| `/about` | About RentCheck |
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

12 sync routes at `/api/sync/[source]`, scheduled via `vercel.json`:

| Source ID | Data | Schedule |
|---|---|---|
| `nyc-hpd` | NYC HPD housing violations | Daily 3am ET |
| `nyc-dob` | NYC DOB building complaints | Daily 3:30am ET |
| `nyc-registration` | NYC rent registration / owner data | Daily 4am ET |
| `chicago` | Chicago Dept of Buildings violations | Daily 4am ET |
| `sf` | San Francisco DataSF violations | Daily 4am ET |
| `boston` | Boston Inspectional Services | Daily 4:30am ET |
| `philadelphia` | Philadelphia L&I violations | Daily 4:30am ET |
| `austin` | Austin Code enforcement | Daily 5am ET |
| `seattle` | Seattle SDCI violations | Daily 5am ET |
| `los-angeles` | LA LAHD code violations | Daily 5am ET |
| `court-listener` | Federal court cases (CourtListener v4) | Weekly Mon 2am ET |
| `lsc-evictions` | Eviction filing data (Eviction Lab) | Monthly 1st 2am ET |

Manual trigger (admin only): `POST /api/sync/nyc-hpd`

> **Note**: Vercel Pro required for >2 cron jobs and functions with >10s timeout (sync jobs can run up to 5 minutes).

---

## Legal Notes

- **Section 230**: User reviews protected under 47 U.S.C. § 230
- **FCRA**: Not a consumer reporting agency — platform prohibited for tenant screening
- **Fair Housing Act**: No protected-class data collected or displayed
- **Public records**: Sourced directly from government APIs, displayed as-is

---

## Deployment

1. Push to GitHub
2. Connect repo to [Vercel](https://vercel.com)
3. Add all environment variables in Vercel dashboard
4. Deploy — cron jobs activate automatically from `vercel.json`
