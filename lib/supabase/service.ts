import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Service-role Supabase client. Pure module — no `cookies`/`headers` import,
// so any page that only needs public read-only access (landlord/property/
// city/u pages, search, sitemaps, OG image generators, cron jobs) can stay
// static-renderable. createClient with auth lives in ./server alongside its
// `cookies()` dependency.
//
// Use ONLY for code paths that don't depend on the user's session — RLS is
// bypassed.
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    }
  )
}
