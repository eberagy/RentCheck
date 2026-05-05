import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Re-export so existing `from '@/lib/supabase/server'` imports of
// createServiceClient still work. New call sites should import from
// '@/lib/supabase/service' directly to keep `cookies()` out of their
// module graph.
export { createServiceClient } from './service'

// Server component / route handler client (respects RLS via user session)
export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // In Server Components, setAll may fail — safe to ignore
          }
        },
      },
    }
  )
}

