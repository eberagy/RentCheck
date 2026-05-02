import type { Metadata } from 'next'
import Link from 'next/link'
import { Shield, ChevronRight, Home, DollarSign, BellRing, ShieldAlert, Sparkles, ArrowRight } from 'lucide-react'
import { Eyebrow } from '@/components/vett/Eyebrow'
import { US_STATES } from '@/types'

export const metadata: Metadata = {
  title: 'Tenant Rights by State',
  description:
    'Know your rights as a renter in all 50 US states. Security deposits, eviction notices, repair timelines, and legal resources.',
  alternates: { canonical: '/rights' },
}

const UNIVERSAL_RIGHTS = [
  {
    icon: Home,
    title: 'Right to Habitable Housing',
    description:
      'Every renter is legally entitled to a safe, livable home. Landlords must maintain heat, running water, weatherproofing, and basic structural safety — regardless of what your lease says.',
    color: 'text-teal-600',
    bg: 'bg-teal-50',
    border: 'border-teal-200',
  },
  {
    icon: DollarSign,
    title: 'Right to Security Deposit Return',
    description:
      'Your security deposit belongs to you unless your landlord has documented, legitimate deductions. Most states require return within 14–30 days of move-out with an itemized list of any deductions.',
    color: 'text-navy-600',
    bg: 'bg-navy-50',
    border: 'border-navy-200',
  },
  {
    icon: BellRing,
    title: 'Right to Notice Before Entry',
    description:
      'Your landlord cannot enter your home without advance notice — typically 24 to 48 hours — except in a genuine emergency. Repeated unannounced entries may constitute harassment.',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
  {
    icon: ShieldAlert,
    title: 'Right to Freedom from Retaliation',
    description:
      'It is illegal for a landlord to raise your rent, reduce services, or attempt eviction in retaliation for you exercising your legal rights — such as reporting code violations or organizing with neighbors.',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
]

const STATES_WITH_GUIDES = ['MD', 'PA', 'SC', 'NY', 'CA', 'IL', 'TX', 'WA', 'MA']

export default function TenantRightsIndexPage() {
  const featuredStates = US_STATES.filter(s => STATES_WITH_GUIDES.includes(s.abbr))
  const otherStates = US_STATES.filter(s => !STATES_WITH_GUIDES.includes(s.abbr))

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <section className="border-b border-slate-200 bg-white px-7 py-16">
        <div className="mx-auto max-w-[1180px]">
          <Eyebrow tone="teal"><Shield className="inline h-3 w-3" /> Tenant rights guide</Eyebrow>
          <h1 className="mt-[18px] font-display text-[clamp(2.4rem,5vw,4rem)] leading-[1.08] tracking-tight text-slate-900">
            Your rights as a renter,{' '}
            <span className="text-teal-600">
              in plain English.
            </span>
          </h1>
          <p className="mt-3.5 max-w-[640px] text-[17px] leading-relaxed text-slate-600">
            State-specific guides covering deposits, repairs, eviction, and retaliation. Updated regularly with legal citations.
          </p>
          <div className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-4 py-1.5 text-xs font-medium text-amber-800">
            <ShieldAlert className="h-3.5 w-3.5" />
            For educational purposes only — not legal advice.
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1180px] px-7 py-12">
        {/* 4 Universal Rights */}
        <section className="mb-12">
          <h2 className="text-[18px] font-bold text-slate-900 mb-1">4 Rights Every Renter Has — Nationwide</h2>
          <p className="text-[13px] text-slate-500 mb-5">These protections apply in all 50 states, regardless of local law.</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {UNIVERSAL_RIGHTS.map(({ icon: Icon, title, description, color, bg, border }) => (
              <div key={title} className={`flex items-start gap-4 rounded-xl border bg-white p-5 ${border}`}>
                <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${bg}`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <div>
                  <p className="text-[14px] font-bold text-slate-900">{title}</p>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-600">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Full state guides */}
        <section className="mb-10">
          <h2 className="text-[18px] font-bold text-slate-900 mb-1">Full State Guides</h2>
          <p className="text-[13px] text-slate-500 mb-5">Detailed, state-specific breakdowns with local resources and legal citations.</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {featuredStates.map(state => (
              <Link
                key={state.abbr}
                href={`/rights/${state.abbr.toLowerCase()}`}
                className="group flex items-center justify-between rounded-xl border border-navy-200 bg-white p-4 transition-[border-color,box-shadow] duration-200 hover:border-navy-400 hover:shadow-md"
              >
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-base font-extrabold text-navy-800 group-hover:text-navy-900">{state.abbr}</span>
                    <span className="rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-[10.5px] font-bold text-teal-700">Full Guide</span>
                  </div>
                  <p className="text-[12px] text-slate-500">{state.name}</p>
                </div>
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-400 transition-colors group-hover:text-navy-600" />
              </Link>
            ))}
          </div>
        </section>

        {/* All other states */}
        <section>
          <h2 className="text-[16px] font-bold text-slate-700 mb-1">All Other States</h2>
          <p className="text-[13px] text-slate-500 mb-4">General tenant rights information — detailed guides coming soon.</p>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
            {otherStates.map(state => (
              <Link
                key={state.abbr}
                href={`/rights/${state.abbr.toLowerCase()}`}
                className="group flex items-center justify-between rounded-[14px] border border-slate-200 bg-slate-50 p-3 transition-[border-color,background-color] duration-200 hover:border-slate-300 hover:bg-white"
              >
                <div>
                  <p className="text-sm font-bold text-slate-600 group-hover:text-slate-800">{state.abbr}</p>
                  <p className="max-w-[90px] truncate text-[11.5px] text-slate-400">{state.name}</p>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-slate-300 transition-colors group-hover:text-slate-500" />
              </Link>
            ))}
          </div>
        </section>

        <p className="mt-10 border-t border-slate-100 pt-6 text-center text-[12px] text-slate-400">
          This information is for educational purposes only and does not constitute legal advice. Laws vary by locality — consult a licensed attorney in your area.
        </p>
      </div>
    </div>
  )
}
