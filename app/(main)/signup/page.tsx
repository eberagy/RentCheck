import { redirect } from 'next/navigation'

export default function SignupRedirect({
  searchParams,
}: {
  searchParams: { redirectTo?: string }
}) {
  const target = searchParams.redirectTo
    ? `/login?mode=signup&redirectTo=${encodeURIComponent(searchParams.redirectTo)}`
    : '/login?mode=signup'
  redirect(target)
}
