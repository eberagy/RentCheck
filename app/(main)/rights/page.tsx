import type { Metadata } from 'next'
import Link from 'next/link'
import { Shield, ChevronRight, Home, DollarSign, BellRing, ShieldAlert } from 'lucide-react'
import { US_STATES } from '@/types'

export const metadata: Metadata = {
  title: 'Tenant Rights by State | Vett',
  description:
    'Know your rights as a renter in all 50 US states. Security deposits, eviction notices, repair timelines, and legal resources.',
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
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* ── Hero ── */}
      <div className="text-center mb-12">
        <div className="h-16 w-16 bg-navy-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <Shield className="h-8 w-8 text-navy-600" />
        </div>
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
          Know Your Rights as a Renter
        </h1>
        <p className="text-gray-500 mt-3 max-w-lg mx-auto text-base leading-relaxed">
          Access plain-language guides to landlord-tenant law in every US state — security
          deposits, eviction protections, repair timelines, and free legal resources.
        </p>
        <div className="mt-5 inline-flex items-center gap-1.5 text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-full px-4 py-1.5 font-medium">
          <ShieldAlert className="h-3.5 w-3.5" />
          For educational purposes only — not legal advice. Consult a licensed attorney for your
          situation.
        </div>
      </div>

      {/* ── 4 Universal Rights ── */}
      <section className="mb-12">
        <h2 className="text-lg font-bold text-gray-900 mb-1">
          4 Rights Every Renter Has — Nationwide
        </h2>
        <p className="text-sm text-gray-500 mb-5">
          These protections apply in all 50 states, regardless of local law.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {UNIVERSAL_RIGHTS.map(({ icon: Icon, title, description, color, bg, border }) => (
            <div
              key={title}
              className={`bg-white rounded-2xl border ${border} p-5 flex items-start gap-4`}
            >
              <div
                className={`h-10 w-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}
              >
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{title}</p>
                <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── States with full guides ── */}
      <section className="mb-10">
        <h2 className="text-lg font-bold text-gray-900 mb-1">Full State Guides</h2>
        <p className="text-sm text-gray-500 mb-5">
          Detailed, state-specific breakdowns with local resources and legal citations.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {featuredStates.map(state => (
            <Link
              key={state.abbr}
              href={`/rights/${state.abbr.toLowerCase()}`}
              className="group flex items-center justify-between p-4 bg-white border border-navy-200 rounded-2xl hover:border-navy-400 hover:shadow-md transition-all"
            >
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-base font-bold text-navy-800 group-hover:text-navy-900">
                    {state.abbr}
                  </span>
                  <span className="text-xs bg-teal-100 text-teal-700 border border-teal-200 rounded-full px-2 py-0.5 font-semibold">
                    Full Guide
                  </span>
                </div>
                <p className="text-xs text-gray-500">{state.name}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-navy-600 transition-colors flex-shrink-0" />
            </Link>
          ))}
        </div>
      </section>

      {/* ── Coming-soon states ── */}
      <section>
        <h2 className="text-base font-semibold text-gray-700 mb-1">All Other States</h2>
        <p className="text-sm text-gray-400 mb-4">
          General tenant rights information — detailed guides coming soon.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
          {otherStates.map(state => (
            <Link
              key={state.abbr}
              href={`/rights/${state.abbr.toLowerCase()}`}
              className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-xl hover:border-gray-300 hover:bg-white transition-all group"
            >
              <div>
                <p className="font-semibold text-gray-600 text-sm group-hover:text-gray-800">
                  {state.abbr}
                </p>
                <p className="text-xs text-gray-400 truncate max-w-[90px]">{state.name}</p>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-gray-500 transition-colors" />
            </Link>
          ))}
        </div>
      </section>

      <p className="text-center text-xs text-gray-400 mt-10 border-t border-gray-100 pt-6">
        This information is for educational purposes only and does not constitute legal advice. Laws
        vary by locality — consult a licensed attorney in your area.
      </p>
    </div>
  )
}
