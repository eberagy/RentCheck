'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, Loader2, Mail, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/Logo'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

const BENEFITS = [
  'Read lease-verified renter reviews',
  'See public court records & violations',
  'Get alerts when landlords are flagged',
]

const REDIRECT_MESSAGES: Record<string, string> = {
  '/review/new': 'Sign in to write your review',
  '/watchlist': 'Sign in to manage your watchlist',
  '/dashboard': 'Sign in to access your dashboard',
}

type Mode = 'password' | 'magic'
type PasswordTab = 'signin' | 'signup'

export default function LoginPage() {
  const [googleLoading, setGoogleLoading] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [magicSent, setMagicSent] = useState(false)
  const [mode, setMode] = useState<Mode>('password')
  const [passwordTab, setPasswordTab] = useState<PasswordTab>('signin')

  const { signInWithGoogle } = useAuth()
  const router = useRouter()
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
  }

  async function handlePasswordAuth(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password) return
    setLoading(true)
    const supabase = createClient()

    if (passwordTab === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      setLoading(false)
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Wrong email or password.')
        } else if (error.message.includes('Email not confirmed')) {
          toast.error('Please confirm your email first.')
        } else {
          toast.error(error.message)
        }
      } else {
        router.push(redirectTo)
      }
    } else {
      if (!fullName.trim()) {
        toast.error('Please enter your full name.')
        setLoading(false)
        return
      }
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: fullName.trim() },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
        },
      })
      setLoading(false)
      if (error) {
        toast.error(error.message)
      } else {
        toast.success('Account created! Check your email to confirm, then sign in.')
        setPasswordTab('signin')
        setPassword('')
      }
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
      },
    })
    setLoading(false)
    if (error) {
      toast.error('Could not send magic link. Please try again.')
    } else {
      setMagicSent(true)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel ── */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-gradient-to-br from-navy-900 via-navy-800 to-navy-700 px-14 py-12 text-white">
        <div>
          <Logo size="lg" href="/" />
        </div>
        <div className="space-y-10">
          <div>
            <h2 className="text-4xl font-extrabold leading-tight tracking-tight">
              Know your landlord<br />before you sign.
            </h2>
            <p className="mt-4 text-navy-100 text-lg leading-relaxed max-w-sm">
              Research landlords using real public records, court filings, and renter reviews — before you commit.
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
        <div className="space-y-3">
          <p className="text-sm text-navy-200">
            Join renters across <span className="font-semibold text-white">20+ cities</span> researching landlords before signing.
          </p>
          <p className="text-xs text-navy-300">No spam. No selling data. Free to use.</p>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-white">
        <div className="lg:hidden mb-8">
          <Logo size="lg" href="/" />
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-navy-900 tracking-tight">
              Sign in to Vett
            </h1>
            {contextMessage ? (
              <p className="mt-2 text-sm font-medium text-teal-600">{contextMessage}</p>
            ) : (
              <p className="mt-2 text-sm text-gray-500">Protect yourself — research before you rent.</p>
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
              {/* Google */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-60"
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

              <div className="flex items-center gap-3">
                <div className="flex-1 border-t border-gray-200" />
                <span className="text-xs text-gray-400 font-medium">or</span>
                <div className="flex-1 border-t border-gray-200" />
              </div>

              {/* Mode toggle */}
              <div className="flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
                <button
                  type="button"
                  onClick={() => setMode('password')}
                  className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${mode === 'password' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Email & password
                </button>
                <button
                  type="button"
                  onClick={() => setMode('magic')}
                  className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${mode === 'magic' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Magic link
                </button>
              </div>

              {mode === 'password' ? (
                <div>
                  {/* Sign in / Sign up tabs */}
                  <div className="flex border-b border-gray-200 mb-4">
                    <button
                      type="button"
                      onClick={() => setPasswordTab('signin')}
                      className={`flex-1 pb-2 text-sm font-medium transition-colors ${passwordTab === 'signin' ? 'text-navy-700 border-b-2 border-navy-700' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      Sign in
                    </button>
                    <button
                      type="button"
                      onClick={() => setPasswordTab('signup')}
                      className={`flex-1 pb-2 text-sm font-medium transition-colors ${passwordTab === 'signup' ? 'text-navy-700 border-b-2 border-navy-700' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      Create account
                    </button>
                  </div>

                  <form onSubmit={handlePasswordAuth} className="space-y-3">
                    {passwordTab === 'signup' && (
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Full name"
                        required
                        className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-500/20"
                      />
                    )}
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-500/20"
                    />
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={passwordTab === 'signup' ? 'Create a password (8+ chars)' : 'Password'}
                        required
                        minLength={passwordTab === 'signup' ? 8 : undefined}
                        className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3.5 pr-10 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-500/20"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <Button
                      type="submit"
                      disabled={loading || !email.trim() || !password}
                      className="w-full h-11 bg-navy-700 text-white hover:bg-navy-800 text-sm font-semibold"
                    >
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {passwordTab === 'signup' ? 'Creating account…' : 'Signing in…'}
                        </span>
                      ) : (
                        passwordTab === 'signup' ? 'Create account' : 'Sign in'
                      )}
                    </Button>
                    {passwordTab === 'signin' && (
                      <p className="text-center text-xs text-gray-400">
                        Forgot your password?{' '}
                        <button
                          type="button"
                          onClick={() => { setMode('magic'); toast.info('Enter your email and we\'ll send a magic link to reset access.') }}
                          className="underline hover:text-gray-600"
                        >
                          Use magic link
                        </button>
                      </p>
                    )}
                  </form>
                </div>
              ) : (
                <form onSubmit={handleMagicLink} className="space-y-3">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-500/20"
                  />
                  <Button
                    type="submit"
                    disabled={loading || !email.trim()}
                    className="w-full h-11 bg-navy-700 text-white hover:bg-navy-800 text-sm font-semibold"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Sending…
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Send magic link
                      </span>
                    )}
                  </Button>
                  <p className="text-xs text-center text-gray-400">
                    We&apos;ll email you a one-click sign-in link. No password needed.
                  </p>
                </form>
              )}

              <p className="text-xs text-center text-gray-400 pt-1">
                By signing in, you agree to our{' '}
                <Link href="/terms" className="underline hover:text-gray-600">Terms</Link>
                {' '}and{' '}
                <Link href="/privacy" className="underline hover:text-gray-600">Privacy Policy</Link>.
              </p>
            </div>
          )}

          <div className="mt-6 text-center">
            <Link href="/" className="text-sm text-gray-400 hover:text-navy-600 transition-colors underline underline-offset-2">
              Continue as guest
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
