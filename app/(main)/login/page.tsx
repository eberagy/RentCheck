'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, Loader2, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/Logo'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

const BENEFITS = [
  'Read verified renter reviews',
  'See public court records & violations',
  'Get alerts when landlords are flagged',
]

const REDIRECT_MESSAGES: Record<string, string> = {
  '/write-review': 'Sign in to write your review',
  '/watchlist': 'Sign in to manage your watchlist',
  '/dashboard': 'Sign in to access your dashboard',
}

export default function LoginPage() {
  const [googleLoading, setGoogleLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [magicLoading, setMagicLoading] = useState(false)
  const [magicSent, setMagicSent] = useState(false)

  const { signInWithGoogle } = useAuth()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') ?? '/dashboard'

  const contextMessage =
    REDIRECT_MESSAGES[redirectTo] ??
    (redirectTo !== '/dashboard' ? 'Sign in to continue' : null)

  async function handleGoogleSignIn() {
    setGoogleLoading(true)
    const { error } = await signInWithGoogle(redirectTo)
    if (error) {
      toast.error('Sign in failed. Please try again.')
      setGoogleLoading(false)
    }
    // On success the browser redirects — no need to reset state
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setMagicLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
      },
    })
    setMagicLoading(false)
    if (error) {
      toast.error('Could not send magic link. Please try again.')
    } else {
      setMagicSent(true)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel — hidden on mobile ── */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-gradient-to-br from-navy-900 via-navy-800 to-navy-700 px-14 py-12 text-white">
        {/* Logo */}
        <div>
          <div className="flex items-center gap-2">
            <svg width="36" height="36" viewBox="0 0 24 28" fill="none" aria-hidden>
              <path d="M12 0L24 4V18C24 23.523 18.627 28.523 12 31C5.373 28.523 0 23.523 0 18V4L12 0Z" fill="#1E3A5F"/>
              <path d="M12 4L20 7.2V17.6C20 21.901 16.701 25.701 12 27.2C7.299 25.701 4 21.901 4 17.6V7.2L12 4Z" fill="#0F7B6C"/>
              <text x="6.5" y="19" fontFamily="Inter, system-ui" fontSize="9" fontWeight="700" fill="white" letterSpacing="-0.3">RC</text>
            </svg>
            <span className="text-2xl font-bold tracking-tight">Vett</span>
          </div>
        </div>

        {/* Value proposition */}
        <div className="space-y-10">
          <div>
            <h2 className="text-4xl font-extrabold leading-tight tracking-tight">
              Know your landlord<br />before you sign.
            </h2>
            <p className="mt-4 text-navy-100 text-lg leading-relaxed max-w-sm">
              Join 10,000+ renters who research before signing. Real reviews, public court records, and violation histories — all in one place.
            </p>
          </div>

          <ul className="space-y-4">
            {BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-center gap-3 text-base text-white">
                <CheckCircle2 className="h-5 w-5 text-teal-500 flex-shrink-0" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Social proof + privacy note */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            {/* Avatar stack */}
            <div className="flex -space-x-2">
              {['#4F46E5', '#0891B2', '#059669', '#D97706'].map((color, i) => (
                <span
                  key={i}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-navy-800 text-xs font-semibold text-white"
                  style={{ backgroundColor: color }}
                >
                  {['A', 'J', 'M', 'S'][i]}
                </span>
              ))}
            </div>
            <p className="text-sm text-navy-200">
              <span className="font-semibold text-white">10,000+</span> renters researching landlords
            </p>
          </div>
          <p className="text-xs text-navy-300">
            No spam. No selling data. Cancel anytime.
          </p>
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-white">
        {/* Mobile logo */}
        <div className="lg:hidden mb-8">
          <Logo size="lg" href="/" />
        </div>

        <div className="w-full max-w-sm">
          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-navy-900 tracking-tight">
              Sign in to Vett
            </h1>
            {contextMessage && (
              <p className="mt-2 text-sm font-medium text-teal-600">
                {contextMessage}
              </p>
            )}
            {!contextMessage && (
              <p className="mt-2 text-sm text-gray-500">
                Protect yourself — research before you rent.
              </p>
            )}
          </div>

          {magicSent ? (
            <div className="rounded-xl border border-teal-200 bg-teal-50 p-6 text-center">
              <Mail className="mx-auto mb-3 h-8 w-8 text-teal-600" />
              <p className="font-semibold text-teal-800">Check your inbox</p>
              <p className="mt-1 text-sm text-teal-700">
                We sent a magic link to <span className="font-medium">{email}</span>.
                Click it to sign in.
              </p>
              <button
                className="mt-4 text-xs text-gray-400 hover:text-gray-600 underline"
                onClick={() => { setMagicSent(false); setEmail('') }}
              >
                Use a different email
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Google button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {googleLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                ) : (
                  <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24" aria-hidden>
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                )}
                {googleLoading ? 'Signing in…' : 'Continue with Google'}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 border-t border-gray-200" />
                <span className="text-xs text-gray-400 font-medium">or</span>
                <div className="flex-1 border-t border-gray-200" />
              </div>

              {/* Magic link form */}
              <form onSubmit={handleMagicLink} className="space-y-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3.5 text-sm text-gray-900 placeholder-gray-400 transition-colors outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-500/20 disabled:opacity-50"
                />
                <Button
                  type="submit"
                  disabled={magicLoading || !email.trim()}
                  className="w-full h-11 bg-navy-700 text-white hover:bg-navy-800 text-sm font-semibold"
                >
                  {magicLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending…
                    </span>
                  ) : (
                    'Send magic link'
                  )}
                </Button>
              </form>

              {/* Legal */}
              <p className="text-xs text-center text-gray-400 pt-1">
                By signing in, you agree to our{' '}
                <Link href="/terms" className="underline hover:text-gray-600">Terms</Link>
                {' '}and{' '}
                <Link href="/privacy" className="underline hover:text-gray-600">Privacy Policy</Link>.
              </p>
            </div>
          )}

          {/* Guest link */}
          <div className="mt-6 text-center">
            <Link
              href="/"
              className="text-sm text-gray-400 hover:text-navy-600 transition-colors underline underline-offset-2"
            >
              Continue as guest
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
