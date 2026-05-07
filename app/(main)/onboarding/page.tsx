'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, User, MapPin, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/Logo'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { COLLEGE_CITIES } from '@/types'
import { captureException } from '@/lib/sentry'
import type { UserType } from '@/types'

type Step = 'role' | 'city'

const ROLE_OPTIONS: { value: Extract<UserType, 'renter' | 'landlord'>; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: 'renter',
    label: 'Renter',
    description: 'I want to research landlords and read reviews before signing a lease.',
    icon: <User className="h-8 w-8" aria-hidden="true" />,
  },
  {
    value: 'landlord',
    label: 'Landlord',
    description: 'I manage rental properties and want to build my verified reputation.',
    icon: <Building2 className="h-8 w-8" aria-hidden="true" />,
  },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('role')
  const [selectedRole, setSelectedRole] = useState<'renter' | 'landlord' | null>(null)
  const [selectedCity, setSelectedCity] = useState<string>('')
  const [saving, setSaving] = useState(false)

  async function handleFinish() {
    if (!selectedRole) return
    setSaving(true)
    const supabase = createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      toast.error('Session expired. Please sign in again.')
      router.push('/login')
      return
    }

    const updatePayload: Record<string, unknown> = {
      user_type: selectedRole,
      updated_at: new Date().toISOString(),
    }

    // Store city in bio field as a fallback if no dedicated city column exists.
    // If your profiles table has a city column, replace this line accordingly.
    if (selectedCity) {
      const cityEntry = COLLEGE_CITIES.find(
        (c) => `${c.city}, ${c.state}` === selectedCity
      )
      if (cityEntry) {
        // Try a city column first; fall back to a metadata field
        updatePayload['city'] = cityEntry.city
        updatePayload['state'] = cityEntry.state
      }
    }

    const { error } = await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', user.id)

    setSaving(false)

    if (error) {
      // Onboarding failure means a new user can't set their role —
      // they'll bounce out without ever using the product. Sentry-route
      // so we know about it before churn does.
      console.error('[onboarding] profile update failed:', error.message)
      captureException(error, { where: 'onboarding:profile-update' })
      toast.error('Could not save your preferences. Please try again.')
      return
    }

    toast.success('Welcome to Vett!')
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 px-6 py-4">
        <Logo href="/" size="md" />
      </header>

      {/* Progress bar */}
      <div className="h-1 bg-slate-200">
        <div
          className="h-1 bg-teal-500 transition-all duration-500"
          style={{ width: step === 'role' ? '50%' : '100%' }}
        />
      </div>

      {/* This was <main>, but (main)/layout.tsx already renders one — two
          <main> elements per page is an HTML5 spec violation that screen
          readers handle inconsistently. Plain <div> here; the parent
          layout's main is the landmark. */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-xl">
          {/* Step indicator */}
          <p className="text-xs font-semibold text-teal-600 uppercase tracking-widest mb-3 text-center">
            Step {step === 'role' ? '1' : '2'} of 2
          </p>

          {/* ── Step 1: Role selection ── */}
          {step === 'role' && (
            <div className="space-y-8">
              <div className="text-center">
                <h1 className="text-3xl font-extrabold text-navy-900 tracking-tight">
                  Who are you?
                </h1>
                <p className="mt-2 text-slate-500 text-base">
                  This helps us personalise your Vett experience.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {ROLE_OPTIONS.map((option) => {
                  const isSelected = selectedRole === option.value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setSelectedRole(option.value)}
                      className={[
                        'relative rounded-2xl border-2 p-6 text-left transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-500 focus-visible:ring-offset-2',
                        isSelected
                          ? 'border-teal-500 bg-teal-50 shadow-md'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm',
                      ].join(' ')}
                    >
                      {isSelected && (
                        <CheckCircle2 className="absolute top-4 right-4 h-5 w-5 text-teal-500" />
                      )}
                      <div className={isSelected ? 'text-teal-600' : 'text-navy-700'}>
                        {option.icon}
                      </div>
                      <p className={`mt-3 font-bold text-lg ${isSelected ? 'text-teal-800' : 'text-navy-900'}`}>
                        {option.label}
                      </p>
                      <p className="mt-1 text-sm text-slate-500 leading-relaxed">
                        {option.description}
                      </p>
                    </button>
                  )
                })}
              </div>

              <Button
                onClick={() => setStep('city')}
                disabled={!selectedRole}
                className="w-full h-12 bg-navy-700 hover:bg-navy-800 text-white font-semibold text-base flex items-center justify-center gap-2"
              >
                Continue
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          )}

          {/* ── Step 2: City selection ── */}
          {step === 'city' && (
            <div className="space-y-8">
              <div className="text-center">
                <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-navy-100 mb-4">
                  <MapPin className="h-7 w-7 text-navy-700" aria-hidden="true" />
                </div>
                <h1 className="text-3xl font-extrabold text-navy-900 tracking-tight">
                  Which city are you in?
                </h1>
                <p className="mt-2 text-slate-500 text-base">
                  We&rsquo;ll surface landlords and reviews near you first.
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-6 space-y-4">
                <label htmlFor="city-select" className="block text-sm font-semibold text-navy-800">
                  Select your city
                </label>
                <select
                  id="city-select"
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="w-full h-11 rounded-lg border border-slate-300 bg-white px-3.5 text-sm text-slate-900 transition-colors outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-500/20 disabled:opacity-50 appearance-none"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
                >
                  <option value="">— Choose a city —</option>
                  {COLLEGE_CITIES.map((c) => (
                    <option key={`${c.city}-${c.state}`} value={`${c.city}, ${c.state}`}>
                      {c.city}, {c.state}
                    </option>
                  ))}
                </select>

                {selectedCity && (
                  <p className="text-xs text-slate-500">
                    Universities:{' '}
                    {COLLEGE_CITIES.find(
                      (c) => `${c.city}, ${c.state}` === selectedCity
                    )?.universities.join(', ')}
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep('role')}
                  className="flex-1 h-12 font-semibold"
                >
                  Back
                </Button>
                <Button
                  onClick={handleFinish}
                  disabled={saving}
                  className="flex-[2] h-12 bg-navy-700 hover:bg-navy-800 text-white font-semibold text-base flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      Saving…
                    </>
                  ) : (
                    <>
                      Finish setup
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </>
                  )}
                </Button>
              </div>

              <p className="text-center text-xs text-slate-400">
                Don&rsquo;t see your city?{' '}
                <button
                  type="button"
                  className="underline hover:text-slate-600 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500 focus-visible:ring-offset-2"
                  onClick={handleFinish}
                >
                  Skip for now
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
