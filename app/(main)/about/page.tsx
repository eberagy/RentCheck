import type { Metadata } from 'next'
import Link from 'next/link'
import Script from 'next/script'
import { Shield, Search, BarChart3, Scale, ArrowRight } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/server'

// Refresh once per hour. The numbers come from the city_stats cache,
// which is itself refreshed nightly via cron, so anything tighter would
// just rebuild the same RSC.
export const revalidate = 3600

export const metadata: Metadata = {
  title: 'About — Glassdoor for Landlords',
  description: 'Vett is a free platform that combines lease-verified renter reviews with public government records to help renters make informed housing decisions.',
  alternates: { canonical: '/about' },
}

async function loadStats() {
  const service = createServiceClient()
  // city_stats is the same cache the city/admin pages use — pre-aggregated
  // via cron (migration 112), so this is one fast index scan.
  const [{ data: agg }, { count: reviewCount }] = await Promise.all([
    service
      .from('city_stats')
      .select('record_count, landlord_count, state_abbr, city'),
    service
      .from('reviews')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved'),
  ])

  let totalRecords = 0
  let totalLandlords = 0
  const states = new Set<string>()
  const cities = new Set<string>()
  for (const r of agg ?? []) {
    totalRecords += r.record_count ?? 0
    totalLandlords += r.landlord_count ?? 0
    if (r.state_abbr) states.add(r.state_abbr)
    if (r.city && r.state_abbr) cities.add(`${r.state_abbr}::${r.city}`)
  }

  return {
    landlords: totalLandlords,
    records: totalRecords,
    cities: cities.size,
    states: states.size,
    reviews: reviewCount ?? 0,
  }
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`
  return String(n)
}

const aboutJsonLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'AboutPage',
  name: 'About Vett',
  url: 'https://vettrentals.com/about',
  mainEntity: {
    '@type': 'Organization',
    '@id': 'https://vettrentals.com/#organization',
    name: 'Vett',
    url: 'https://vettrentals.com',
    slogan: 'Know before you rent',
    description: 'Lease-verified renter reviews and public records on landlords nationwide.',
  },
})

export default async function AboutPage() {
  const stats = await loadStats()
  const values = [
    { icon: Shield, num: '01', title: 'Transparency', desc: 'We surface public records and lease-verified experiences that have historically been difficult for renters to access.' },
    { icon: Scale, num: '02', title: 'Fairness', desc: 'All landlords — claimed or not — follow the same fair process. No pay-to-remove, no pay-to-hide.' },
    { icon: Search, num: '03', title: 'Accuracy', desc: 'Public records are sourced directly from government APIs. Reviews require lease verification before publication.' },
    { icon: BarChart3, num: '04', title: 'Empowerment', desc: 'Renters deserve the same information advantage that landlords have. We exist to level that playing field.' },
  ]

  return (
    <div className="bg-white">
      <Script id="about-jsonld" type="application/ld+json" strategy="beforeInteractive">
        {aboutJsonLd}
      </Script>
      {/* ── HERO ── */}
      <section className="relative isolate overflow-hidden bg-[#07111f] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_-10%,rgba(15,123,108,0.2),transparent_55%),radial-gradient(ellipse_at_80%_110%,rgba(30,58,95,0.25),transparent_55%)]" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
            backgroundSize: '64px 64px',
            maskImage: 'radial-gradient(ellipse 60% 50% at 50% 40%, black 40%, transparent 80%)',
          }}
        />

        <div className="relative mx-auto max-w-[1100px] px-6 pb-24 pt-20 lg:pb-32 lg:pt-28">
          <p className="text-[11px] font-mono uppercase tracking-widest text-teal-300/80">§ About · Vett</p>
          <h1 className="mt-5 max-w-[820px] font-display text-[clamp(2.5rem,6vw,5rem)] leading-[1.02] tracking-tight">
            The transparency platform
            <br />
            <span className="italic text-slate-400">for renters.</span>
          </h1>
          <p className="mt-7 max-w-[580px] text-[17px] leading-relaxed text-slate-300/90">
            Lease-verified renter reviews, housing court records, code violation histories, and eviction filings — all in one searchable database.
          </p>
        </div>
      </section>

      {/* ── BY THE NUMBERS (live from city_stats cache) ── */}
      <section className="border-b border-slate-100 bg-white">
        <div className="mx-auto max-w-[1100px] px-6 py-14 lg:py-16">
          <p className="text-[11px] font-mono uppercase tracking-widest text-slate-400">§ By the numbers</p>
          <p className="mt-2 max-w-[640px] text-[15px] leading-relaxed text-slate-600">
            Live coverage as of today. Counts refresh nightly from public-record syncs.
          </p>
          <dl className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {[
              { label: 'Landlords tracked',      value: formatCount(stats.landlords) },
              { label: 'Public records',         value: formatCount(stats.records)   },
              { label: 'Verified reviews',       value: formatCount(stats.reviews)   },
              { label: 'Cities covered',         value: formatCount(stats.cities)    },
              { label: 'States covered',         value: formatCount(stats.states)    },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
                <div className="font-display text-[28px] leading-none tracking-tight text-slate-950">{value}</div>
                <div className="mt-2 text-[11.5px] uppercase tracking-[0.18em] text-slate-500">{label}</div>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── WHY WE EXIST — editorial two-column ── */}
      <section className="border-b border-slate-100 py-24 lg:py-32">
        <div className="mx-auto max-w-[1100px] px-6">
          <div className="grid gap-12 lg:grid-cols-[220px_1fr] lg:gap-20">
            <div>
              <p className="text-[11px] font-mono uppercase tracking-widest text-slate-400">§ 01</p>
              <h2 className="mt-3 font-display text-[clamp(1.5rem,2.5vw,2rem)] leading-tight tracking-tight text-slate-900">
                Why we
                <br />
                <span className="italic text-slate-400">exist.</span>
              </h2>
            </div>
            <div className="max-w-[640px] text-[17px] leading-[1.7] text-slate-700 space-y-5">
              <p className="first-letter:font-display first-letter:text-[64px] first-letter:leading-[0.9] first-letter:float-left first-letter:mr-3 first-letter:mt-1 first-letter:text-teal-600">
                When you apply for a job, you can look up the company on Glassdoor. When you pick a restaurant, you check Yelp. But when you sign a 12-month lease — often the largest financial commitment in a renter&apos;s life — there&apos;s nowhere to look up the landlord&apos;s track record.
              </p>
              <p className="text-slate-600">
                We started Vett because renters deserve the same tools everyone else has. Public records like HPD violations, eviction filings, and housing court cases exist — but they&apos;re buried, fragmented, and hard to use. We aggregate them, normalize them, and make them searchable alongside lease-verified reviews from real tenants.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── VALUES ── */}
      <section className="border-b border-slate-100 bg-slate-50 py-24 lg:py-32">
        <div className="mx-auto max-w-[1100px] px-6">
          <div className="mb-14">
            <p className="text-[11px] font-mono uppercase tracking-widest text-slate-400">§ 02</p>
            <h2 className="mt-3 font-display text-[clamp(1.8rem,3.5vw,2.8rem)] leading-[1.05] tracking-tight text-slate-900">
              Our values,
              <br />
              <span className="italic text-slate-400">in four principles.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {values.map(({ icon: Icon, num, title, desc }) => (
              <div key={title} className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 transition-all duration-300 hover:border-teal-300 hover:shadow-[0_16px_40px_-16px_rgba(15,123,108,0.18)]">
                <div className="flex items-start gap-5">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-teal-50 ring-1 ring-teal-100">
                    <Icon className="h-5 w-5 text-teal-600" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="flex items-baseline gap-3">
                      <span className="font-mono text-[11px] font-semibold tracking-widest text-slate-300">{num}</span>
                      <h3 className="font-display text-[22px] leading-tight tracking-tight text-slate-900">{title}</h3>
                    </div>
                    <p className="mt-3 text-[14.5px] leading-relaxed text-slate-600">{desc}</p>
                  </div>
                </div>
                <div className="absolute top-0 right-0 h-full w-1 bg-teal-500 scale-y-0 origin-top transition-transform duration-500 group-hover:scale-y-100" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW REVIEWS / RECORDS / LEGAL ── */}
      <section className="py-24 lg:py-32">
        <div className="mx-auto max-w-[1100px] px-6">
          <div className="grid gap-12 lg:grid-cols-[220px_1fr] lg:gap-20">
            <div>
              <p className="text-[11px] font-mono uppercase tracking-widest text-slate-400">§ 03</p>
              <h2 className="mt-3 font-display text-[clamp(1.5rem,2.5vw,2rem)] leading-tight tracking-tight text-slate-900">
                How the platform
                <br />
                <span className="italic text-slate-400">actually works.</span>
              </h2>
            </div>

            <div className="max-w-[640px] space-y-12">
              <div>
                <h3 className="font-display text-[22px] leading-tight tracking-tight text-slate-900">How reviews work</h3>
                <p className="mt-3 text-[15.5px] leading-relaxed text-slate-600">
                  Every review on Vett goes through a moderation process. Reviewers upload their lease before publication, and our founders or moderators manually confirm it. All published reviews carry a &ldquo;Lease Verified&rdquo; badge and are screened for our{' '}
                  <Link href="/terms" className="font-medium text-teal-700 underline-offset-4 hover:underline">content guidelines</Link> before publication.
                </p>
              </div>

              <div>
                <h3 className="font-display text-[22px] leading-tight tracking-tight text-slate-900">How public records work</h3>
                <p className="mt-3 text-[15.5px] leading-relaxed text-slate-600">
                  We pull data daily from official government APIs — NYC HPD, Chicago Dept of Buildings, SF DataSF, and more. Records are automatically linked to landlord profiles when claimed, or shown with a warning on the property address. We never modify government records; we only surface them.
                </p>
              </div>

              <div>
                <h3 className="font-display text-[22px] leading-tight tracking-tight text-slate-900">Legal &amp; compliance</h3>
                <p className="mt-3 text-[15.5px] leading-relaxed text-slate-600">
                  Vett operates under Section 230 of the Communications Decency Act for user-generated content. We are not a consumer reporting agency and our platform does not constitute a &ldquo;consumer report&rdquo; under the FCRA. For more, see our{' '}
                  <Link href="/fcra-notice" className="font-medium text-teal-700 underline-offset-4 hover:underline">FCRA Notice</Link>.
                </p>
                <p className="mt-3 text-[15.5px] leading-relaxed text-slate-600">
                  If you believe any information on our platform is inaccurate, you can{' '}
                  <Link href="/faq#disputes" className="font-medium text-teal-700 underline-offset-4 hover:underline">submit a dispute</Link>. Landlords can{' '}
                  <Link href="/landlord-portal/claim" className="font-medium text-teal-700 underline-offset-4 hover:underline">claim their profiles</Link> to respond to reviews and correct business information.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="border-t border-slate-100 bg-[#07111f] text-white">
        <div className="mx-auto max-w-[1100px] px-6 py-20 lg:py-24">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] font-mono uppercase tracking-widest text-teal-300/80">Get started</p>
              <h2 className="mt-3 font-display text-[clamp(1.8rem,3.5vw,2.8rem)] leading-[1.05] tracking-tight">
                Research before
                <br />
                <span className="italic text-slate-400">you sign.</span>
              </h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/search"
                className="inline-flex items-center gap-2 rounded-md bg-white px-6 py-3 text-[14px] font-semibold text-slate-900 transition-colors hover:bg-slate-100"
              >
                Search landlords <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/review/new"
                className="inline-flex items-center gap-2 rounded-md border border-white/15 px-6 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-white/[0.08]"
              >
                Write a review
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
