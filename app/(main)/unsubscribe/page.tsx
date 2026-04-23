import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BellOff, Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Unsubscribe from emails',
  description: 'Manage the emails Vett sends you.',
  robots: { index: false, follow: false },
}

export default async function UnsubscribePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard/settings#email-preferences')
  }

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
          Vett emails are tied to your account. Sign in to adjust which notifications you receive, or
          disable them all in one click from your settings.
        </p>

        <div className="mt-7 flex flex-col items-center gap-3">
          <Button asChild className="rounded-full bg-navy-600 px-6 hover:bg-navy-700 text-white">
            <Link href="/login?redirectTo=/dashboard/settings">
              <Mail className="mr-2 h-4 w-4" /> Sign in to manage emails
            </Link>
          </Button>
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-700">
            Back to home
          </Link>
        </div>

        <p className="mt-10 text-xs text-slate-400">
          If you keep getting emails you didn&apos;t sign up for, email{' '}
          <a href="mailto:support@vettrentals.com" className="underline underline-offset-2 hover:text-slate-600">
            support@vettrentals.com
          </a>{' '}
          and we&apos;ll sort it out.
        </p>
      </div>
    </div>
  )
}
