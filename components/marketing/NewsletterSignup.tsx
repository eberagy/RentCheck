'use client'

import { useState, type FormEvent } from 'react'
import { Mail, CheckCircle2, Loader2 } from 'lucide-react'

interface NewsletterSignupProps {
  /** The value sent to email_leads.source — categorizes where the signup came from. */
  source?: string
  /** Copy override. */
  heading?: string
  description?: string
  /** Visual theme. Default 'dark' suits a dark hero; 'light' suits cards. */
  theme?: 'dark' | 'light'
}

export function NewsletterSignup({
  source = 'homepage',
  heading = 'Not in your city yet?',
  description = "Drop your email — we'll let you know when Vett covers your area.",
  theme = 'dark',
}: NewsletterSignupProps) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed) return
    setStatus('loading')
    setErrorMsg(null)
    try {
      const res = await fetch('/api/email-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, source }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Could not save')
      }
      setStatus('success')
    } catch (err) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Could not save')
    }
  }

  const dark = theme === 'dark'

  if (status === 'success') {
    return (
      <div
        className={`mt-6 flex items-center gap-3 rounded-xl border px-5 py-4 ${
          dark
            ? 'border-white/15 bg-white/[0.04] text-white'
            : 'border-teal-200 bg-teal-50 text-teal-900'
        }`}
      >
        <CheckCircle2 className={`h-5 w-5 flex-shrink-0 ${dark ? 'text-teal-300' : 'text-teal-600'}`} />
        <div>
          <p className="text-[14px] font-semibold">You&apos;re on the list.</p>
          <p className={`text-[12.5px] ${dark ? 'text-slate-400' : 'text-teal-800/80'}`}>
            We&apos;ll email you the moment your area is covered.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-6">
      <p className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${dark ? 'text-teal-300/80' : 'text-teal-700'}`}>
        {heading}
      </p>
      <p className={`mt-1.5 text-[13.5px] ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
        {description}
      </p>
      <form onSubmit={onSubmit} className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <label
          className={`flex flex-1 items-center gap-2 rounded-xl border px-3.5 py-2.5 transition-colors ${
            dark
              ? 'border-white/10 bg-white/[0.04] focus-within:border-teal-300'
              : 'border-slate-200 bg-white focus-within:border-teal-400'
          }`}
        >
          <Mail className={`h-4 w-4 flex-shrink-0 ${dark ? 'text-slate-400' : 'text-slate-400'}`} aria-hidden="true" />
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            aria-label="Email address"
            className={`flex-1 bg-transparent text-[14px] outline-none ${
              dark ? 'text-white placeholder:text-slate-500' : 'text-slate-900 placeholder:text-slate-400'
            }`}
          />
        </label>
        <button
          type="submit"
          disabled={status === 'loading' || email.trim().length === 0}
          className={`inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-[13.5px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
            dark
              ? 'bg-teal-500 text-white hover:bg-teal-400'
              : 'bg-teal-600 text-white hover:bg-teal-700'
          }`}
        >
          {status === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Notify me'}
        </button>
      </form>
      {status === 'error' && errorMsg && (
        <p className={`mt-2 text-[12px] ${dark ? 'text-red-300' : 'text-red-600'}`}>
          {errorMsg}
        </p>
      )}
      <p className={`mt-2 text-[11px] ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
        We only email you about Vett. Unsubscribe any time.
      </p>
    </div>
  )
}
