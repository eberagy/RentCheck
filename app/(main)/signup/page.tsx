import { redirect } from 'next/navigation'
import { safeRedirectPath } from '@/lib/safe-redirect'

// async + Promise-typed searchParams for forward-compat with Next 15
// (where searchParams is mandatory async). On Next 14.2.x this is a
// no-op since Next passes the params object directly and `await` on a
// non-Promise just returns the value. Keeping the rest of the app's
// page.tsx files in the same shape.
export default async function SignupRedirect({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>
}) {
  const params = await searchParams
  // Validate redirectTo against the same-origin allowlist before propagating
  // to /login. LoginClient also revalidates, but normalising here keeps the
  // outbound URL clean for crawlers + analytics.
  const safe = safeRedirectPath(params.redirectTo)
  const target = `/login?mode=signup&redirectTo=${encodeURIComponent(safe)}`
  redirect(target)
}
