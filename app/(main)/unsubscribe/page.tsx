import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BellOff, Mail, CheckCircle2 } from 'lucide-react'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { verifyUnsubscribeToken } from '@/lib/unsubscribe-token'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Unsubscribe from emails',
  description: 'Manage the emails Vett sends you.',
  robots: { index: false, follow: false },
}

interface UnsubscribePageProps {
  searchParams: Promise<{ token?: string }>
}

export default async function UnsubscribePage({ searchParams }: UnsubscribePageProps) {
  const params = await searchParams
  const token = params.token

  // Path A — token-signed one-click unsubscribe from email footers.
  // Flips every email_* preference to false without requiring a login.
  if (token) {
    const payload = verifyUnsubscribeToken(token)
    if (!payload) {
      return (
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
            <BellOff className="h-7 w-7 text-red-600" />
          </div>
          <h1 className="font-display text-[clamp(1.5rem,3vw,2rem)] leading-tight tracking-tight text-slate-900">
            That unsubscribe link has expired
          </h1>
          <p className="mt-3 text-[14px] leading-relaxed text-slate-500">
            Sign in to manage your email preferences directly, or email{' '}
            <a href="mailto:support@vettrentals.com" className="underline hover:text-slate-700">support@vettrentals.com</a> and we&apos;ll do it manually.
          </p>
          <Button asChild className="mt-6 rounded-full bg-navy-600 px-6 hover:bg-navy-700 text-white">
            <Link href="/login?redirectTo=/dashboard/settings">Sign in to manage emails</Link>
          </Button>
        </div>
      )
    }

    const service = createServiceClient()
    const { error: updateErr } = await service
      .from('profiles')
      .update({ email_reviews: false, email_watchlist: false })
      .eq('id', payload.userId)

    if (updateErr) {
      console.error('[unsubscribe] update failed:', updateErr.message)
      return (
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50">
            <Mail className="h-7 w-7 text-amber-600" />
          </div>
          <h1 className="font-display text-[clamp(1.75rem,3.5vw,2.25rem)] leading-tight tracking-tight text-slate-900">
            We hit a snag.
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-slate-500">
            Couldn&apos;t update your preferences. Email{' '}
            <a href="mailto:support@vettrentals.com" className="underline">support@vettrentals.com</a>{' '}
            and we&apos;ll unsubscribe you by hand within 24 hours.
          </p>
        </div>
      )
    }

    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50">
          <CheckCircle2 className="h-7 w-7 text-teal-600" />
        </div>
        <h1 className="font-display text-[clamp(1.75rem,3.5vw,2.25rem)] leading-tight tracking-tight text-slate-900">
          You&apos;re unsubscribed.
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-slate-500">
          We&apos;ll stop sending you review status updates and watchlist alerts. Transactional emails tied to
          account actions (sign-in confirmations, deletion receipts) will still go through.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/dashboard/settings#email-preferences">Adjust by category</Link>
          </Button>
          <Button asChild className="rounded-full bg-navy-600 hover:bg-navy-700 text-white">
            <Link href="/">Back to Vett</Link>
          </Button>
        </div>
      </div>
    )
  }

  // Path B — signed-in user without a token redirects to granular settings.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard/settings#email-preferences')

  // Path C — unsigned, no token. Explain and link to sign-in.
  return (
    <div className="mx-auto max-w-md px-4 py-20">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-navy-50">
          <BellOff className="h-7 w-7 text-navy-600" />
        </div>
        <h1 className="font-display text-[clamp(1.75rem,3.5vw,2.25rem)] leading-tight tracking-tight text-slate-900">
          Manage your email preferences
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-slate-500">
          Every email we send has an unsubscribe link in the footer. Click that for a one-click opt-out.
          Or sign in to adjust which categories you receive.
        </p>

        <div className="mt-7 flex flex-col items-center gap-3">
          <Button asChild className="rounded-full bg-navy-600 px-6 hover:bg-navy-700 text-white">
            <Link href="/login?redirectTo=/dashboard/settings">
              <Mail className="mr-2 h-4 w-4" /> Sign in to manage
            </Link>
          </Button>
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-700">
            Back to home
          </Link>
        </div>

        <p className="mt-10 text-xs text-slate-400">
          Still getting emails you didn&apos;t sign up for? Email{' '}
          <a href="mailto:support@vettrentals.com" className="underline underline-offset-2 hover:text-slate-600">support@vettrentals.com</a>
          {' '}and we&apos;ll unsubscribe you by hand.
        </p>
      </div>
    </div>
  )
}
