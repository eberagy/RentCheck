import type { Metadata } from 'next'
import Link from 'next/link'
import { Mail, Database, ShieldCheck, Newspaper, Download, ArrowUpRight } from 'lucide-react'
import { NewsletterSignup } from '@/components/marketing/NewsletterSignup'

export const metadata: Metadata = {
  title: 'Press & Media',
  description:
    'Press kit, founder bios, methodology, and media contact for Vett — the lease-verified landlord reputation platform combining renter reviews with public records from 20+ cities.',
  alternates: { canonical: '/press' },
  openGraph: {
    title: 'Press & Media · Vett',
    description: 'Methodology, data sourcing, and media contact for Vett.',
  },
}

const FACT_SHEET = [
  { label: 'Founded', value: '2026' },
  { label: 'Headquarters', value: 'Philadelphia, PA' },
  { label: 'Cities covered', value: '20+ and growing' },
  { label: 'Public record sources', value: '50+ government APIs' },
  { label: 'Review verification', value: 'Lease document required' },
  { label: 'Business model', value: 'Free for renters; paid verified badges for landlords' },
]

const SOURCES = [
  'NYC Dept. of Housing Preservation & Development (HPD) violations',
  'NYC Dept. of Buildings complaints + permits',
  'Philadelphia L&I permits + violations',
  'Chicago Dept. of Buildings',
  'San Francisco DataSF',
  'Boston Inspectional Services',
  'Austin Code',
  'Seattle SDCI',
  'CourtListener (federal court filings)',
  'Eviction Lab (eviction filing data)',
  'State and county assessor rolls (ownership resolution)',
]

const HOOKS = [
  {
    title: 'America\'s worst landlords outside NYC',
    desc: 'NYC has a Public Advocate\'s annual Worst Landlord Watchlist. No one publishes the equivalent for the other 20+ metros where Vett has records. The data is there.',
  },
  {
    title: 'Lease-verified reviews vs. the FTC Consumer Review Rule',
    desc: 'The FTC began enforcing its Consumer Review Rule in December 2025. Vett\'s founder-moderated, lease-verified model is documented and reproducible.',
  },
  {
    title: 'College move-in season',
    desc: 'Mid-August through mid-September: students signing their first lease with the least information. Vett seeds college-town coverage as a priority.',
  },
]

export default function PressPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <section className="relative overflow-hidden bg-[#07111f] px-7 py-16 text-white">
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: 'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
            backgroundSize: '64px 64px',
            maskImage: 'radial-gradient(ellipse 60% 50% at 30% 40%, black 40%, transparent 80%)',
          }}
        />
        <div className="relative mx-auto max-w-[1100px]">
          <p className="text-[11px] font-mono uppercase tracking-widest text-teal-300/80">For journalists</p>
          <h1 className="mt-3 font-display text-[clamp(2.5rem,5vw,4.5rem)] leading-[1.02] tracking-tight">
            Press &amp; media
          </h1>
          <p className="mt-4 max-w-[620px] text-[16px] leading-relaxed text-slate-300">
            Vett is a public-interest infrastructure layer that turns scattered government records
            into one landlord profile, then layers lease-verified renter reviews on top. We&apos;re happy
            to share methodology, data exports, and interviews.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a
              href="mailto:press@vettrentals.com"
              className="inline-flex items-center gap-2 rounded-full bg-teal-500 px-5 py-2.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-teal-400"
            >
              <Mail className="h-4 w-4" /> press@vettrentals.com
            </a>
            <Link
              href="/about"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-5 py-2.5 text-[13.5px] font-semibold text-white transition-colors hover:border-white/30"
            >
              About Vett <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1100px] px-7 py-16">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.3fr]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-600">Fact sheet</p>
            <h2 className="mt-3 font-display text-[28px] leading-tight tracking-tight text-slate-900">
              The short version
            </h2>
            <dl className="mt-6 rounded-2xl border border-slate-200 bg-white overflow-hidden">
              {FACT_SHEET.map((f, i) => (
                <div key={f.label} className={`grid grid-cols-[140px_1fr] items-center gap-4 px-5 py-3 ${i < FACT_SHEET.length - 1 ? 'border-b border-slate-100' : ''}`}>
                  <dt className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-slate-400">{f.label}</dt>
                  <dd className="text-[14px] font-medium text-slate-900">{f.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-600">Methodology</p>
            <h2 className="mt-3 font-display text-[28px] leading-tight tracking-tight text-slate-900">
              How we verify
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h3 className="text-[15px] font-bold text-slate-900">Reviews</h3>
                <p className="mt-1 text-[13.5px] leading-relaxed text-slate-600">
                  Every review requires a lease document upload before publication. Founders and
                  moderators verify the lease matches the renter and landlord on file. Lease docs
                  are deleted from storage after 30 days; only a SHA-256 hash is retained for dedup.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-navy-50 text-navy-700">
                  <Database className="h-5 w-5" />
                </div>
                <h3 className="text-[15px] font-bold text-slate-900">Public records</h3>
                <p className="mt-1 text-[13.5px] leading-relaxed text-slate-600">
                  Records come directly from government open data APIs, refreshed daily or weekly.
                  We never modify source data — if an underlying record is wrong, we refer the
                  dispute back to the source agency.
                </p>
              </div>
            </div>
            <p className="mt-4 text-[12.5px] text-slate-500">
              <strong>Vett is not a consumer reporting agency.</strong> The platform is public research infrastructure; it is
              not to be used as a &ldquo;consumer report&rdquo; under FCRA for employment, credit, insurance, or
              tenant-screening decisions. See <Link href="/fcra-notice" className="text-teal-600 hover:underline">our FCRA notice</Link>.
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-[1100px] px-7 py-16">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-600">Data sources</p>
          <h2 className="mt-3 font-display text-[28px] leading-tight tracking-tight text-slate-900">
            Where the records come from
          </h2>
          <ul className="mt-6 grid gap-2 sm:grid-cols-2">
            {SOURCES.map(s => (
              <li key={s} className="flex items-start gap-2 text-[13.5px] text-slate-700">
                <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-teal-500" />
                {s}
              </li>
            ))}
          </ul>
          <p className="mt-5 text-[12.5px] text-slate-500">
            Want a full list with API documentation and refresh cadence? Email
            {' '}<a href="mailto:press@vettrentals.com" className="text-teal-600 hover:underline">press@vettrentals.com</a>.
          </p>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-[1100px] px-7 py-16">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-600">Story hooks</p>
          <h2 className="mt-3 font-display text-[28px] leading-tight tracking-tight text-slate-900">
            What we&apos;re working on this year
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {HOOKS.map(h => (
              <div key={h.title} className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                  <Newspaper className="h-4.5 w-4.5" />
                </div>
                <h3 className="text-[14.5px] font-bold text-slate-900">{h.title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">{h.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-[1100px] px-7 py-16">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-600">Assets</p>
          <h2 className="mt-3 font-display text-[28px] leading-tight tracking-tight text-slate-900">
            Logos &amp; brand
          </h2>
          <p className="mt-3 text-[14px] text-slate-600">
            Standard logo usage: feel free to use &ldquo;Vett&rdquo; in copy with the trademark mark on first
            reference. For logo files in SVG / PNG, or for photography, email
            {' '}<a href="mailto:press@vettrentals.com" className="text-teal-600 hover:underline">press@vettrentals.com</a>
            {' '}with the outlet and deadline.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="mailto:press@vettrentals.com?subject=Press%20kit%20request"
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-2.5 text-[13px] font-semibold text-slate-700 transition-colors hover:border-slate-400"
            >
              <Download className="h-4 w-4" /> Request press kit
            </a>
          </div>

          <div className="mt-14 max-w-xl">
            <NewsletterSignup
              theme="light"
              source="press-page"
              heading="Add me to the press list"
              description="We send occasional notes to reporters about new data releases, embargoes, and investigations."
            />
          </div>
        </div>
      </section>
    </div>
  )
}
