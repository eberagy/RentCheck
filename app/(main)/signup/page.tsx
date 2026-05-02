import { redirect } from 'next/navigation'
import { safeRedirectPath } from '@/lib/safe-redirect'

export default function SignupRedirect({
  searchParams,
}: {
  searchParams: { redirectTo?: string }
}) {
  // Validate redirectTo against the same-origin allowlist before propagating
  // to /login. LoginClient also revalidates, but normalising here keeps the
  // outbound URL clean for crawlers + analytics.
  const safe = safeRedirectPath(searchParams.redirectTo)
  const target = `/login?mode=signup&redirectTo=${encodeURIComponent(safe)}`
  redirect(target)
}
