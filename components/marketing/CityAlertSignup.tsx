'use client'

import { useState, type FormEvent } from 'react'
import { Mail, MapPin, CheckCircle2, Loader2 } from 'lucide-react'
import { US_STATES } from '@/types'

interface CityAlertSignupProps {
  /** Tag stored in email_leads.source. */
  source?: string
  heading?: string
  description?: string
  theme?: 'dark' | 'light'
}

/**
 * No-auth city alert capture: visitor types a city + state + email and we
 * write a row to email_leads. Different from saved_searches (which lives
 * behind login and powers the weekly digest cron) — this is the top-of-
 * funnel "I'm thinking about this city" signal.
 */
export function CityAlertSignup({
  source = 'city_alert_signup',
  heading = 'Get city alerts',
  description = 'Tell us where you’re looking. We’ll email you when new lease-verified reviews land for that city.',
  theme = 'dark',
}: CityAlertSignupProps) {
  const [city, setCity] = useState('')
  const [stateAbbr, setStateAbbr] = useState('')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const dark = theme === 'dark'

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const trimmedCity = city.trim()
    const trimmedEmail = email.trim()
    if (!trimmedCity || !stateAbbr || !trimmedEmail) return
    setStatus('loading')
    setErrorMsg(null)
    try {
      const res = await fetch('/api/email-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmedEmail,
          source,
          city: trimmedCity,
          stateAbbr,
        }),
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

  if (status === 'success') {
    return (
      <div
        className={`mt-6 flex items-center gap-3 rounded-xl border px-5 py-4 ${
          dark ? 'border-white/15 bg-white/[0.04] text-white' : 'border-teal-200 bg-teal-50 text-teal-900'
        }`}
      >
        <CheckCircle2 className={`h-5 w-5 flex-shrink-0 ${dark ? 'text-teal-300' : 'text-teal-600'}`} />
        <div>
          <p className="text-[14px] font-semibold">You&apos;re on the list for {city.trim()}, {stateAbbr}.</p>
          <p className={`text-[12.5px] ${dark ? 'text-slate-400' : 'text-teal-800/80'}`}>
            We&apos;ll email you when new lease-verified reviews land there.
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
      <form onSubmit={onSubmit} className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_120px_1fr_auto] sm:items-center">
        <label
          className={`flex items-center gap-2 rounded-xl border px-3.5 py-2.5 transition-colors ${
            dark
              ? 'border-white/10 bg-white/[0.04] focus-within:border-teal-300'
              : 'border-slate-200 bg-white focus-within:border-teal-400'
          }`}
        >
          <MapPin className="h-4 w-4 flex-shrink-0 text-slate-400" aria-hidden="true" />
          <input
            type="text"
            value={city}
            onChange={e => setCity(e.target.value)}
            placeholder="City"
            required
            maxLength={100}
            aria-label="City"
            className={`flex-1 bg-transparent text-[14px] outline-none ${
              dark ? 'text-white placeholder:text-slate-500' : 'text-slate-900 placeholder:text-slate-400'
            }`}
          />
        </label>
        <select
          value={stateAbbr}
          onChange={e => setStateAbbr(e.target.value)}
          required
          aria-label="State"
          className={`rounded-xl border px-3 py-2.5 text-[14px] outline-none ${
            dark
              ? 'border-white/10 bg-white/[0.04] text-white focus:border-teal-300'
              : 'border-slate-200 bg-white text-slate-900 focus:border-teal-400'
          }`}
        >
          <option value="">State</option>
          {US_STATES.map(s => (
            <option key={s.abbr} value={s.abbr} className="text-slate-900">
              {s.abbr}
            </option>
          ))}
        </select>
        <label
          className={`flex items-center gap-2 rounded-xl border px-3.5 py-2.5 transition-colors ${
            dark
              ? 'border-white/10 bg-white/[0.04] focus-within:border-teal-300'
              : 'border-slate-200 bg-white focus-within:border-teal-400'
          }`}
        >
          <Mail className="h-4 w-4 flex-shrink-0 text-slate-400" aria-hidden="true" />
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
          disabled={status === 'loading' || !city.trim() || !stateAbbr || !email.trim()}
          className={`inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-[13.5px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
            dark ? 'bg-teal-500 text-white hover:bg-teal-400' : 'bg-teal-600 text-white hover:bg-teal-700'
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
        Free. We only email you about Vett. Unsubscribe any time.
      </p>
    </div>
  )
}
