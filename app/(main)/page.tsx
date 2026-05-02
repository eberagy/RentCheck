import Link from 'next/link'
import type { Metadata } from 'next'
import {
  Shield,
  FileText,
  Globe,
  ArrowRight,
  Star,
  Building2,
  MapPin,
} from 'lucide-react'
import { SearchBar } from '@/components/search/SearchBar'
import { ScrollReveal } from '@/components/ui/ScrollReveal'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import { NewsletterSignup } from '@/components/marketing/NewsletterSignup'
import { CityAlertSignup } from '@/components/marketing/CityAlertSignup'
import { Button } from '@/components/ui/button'
import { createServiceClient } from '@/lib/supabase/server'
import { COLLEGE_CITIES } from '@/types'

export const revalidate = 60

export const metadata: Metadata = {
  // `absolute` bypasses the `%s | Vett` template from the root layout so the
  // brand name doesn't duplicate on the homepage.
  title: { absolute: 'Vett — Know Before You Rent' },
  description:
    'Lease-verified renter reviews and public records on landlords in major cities and growing coverage nationwide. Know before you rent.',
  alternates: { canonical: '/' },
}

async function getStats() {
  try {
    const supabase = createServiceClient()
    const [
      { count: reviewCount },
      { count: landlordCount },
      { count: recordCount },
      { data: cityCountResult },
    ] = await Promise.all([
      supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
      supabase.from('landlords').select('*', { count: 'exact', head: true }),
      // public_records is ~360k rows — exact COUNT(*) trips the PostgREST
      // statement timeout. Estimated count (pg_class.reltuples) is fine
      // for a "350,000+ records" headline stat and orders of magnitude
      // cheaper.
      supabase.from('public_records').select('*', { count: 'estimated', head: true }),
      // Postgres-side aggregation. Pulling all 25k landlord rows over the
      // PostgREST API gets capped at 1000 silently, so use an RPC.
      supabase.rpc('count_cities_with_landlords', { min_landlords: 5 }),
    ])

    return {
      reviews: reviewCount ?? 0,
      landlords: landlordCount ?? 0,
      records: recordCount ?? 0,
      cities: Number(cityCountResult ?? 0) || 21,
    }
  } catch {
    return { reviews: 0, landlords: 0, records: 0, cities: 21 }
  }
}

async function getRecentReviews() {
  try {
    const supabase = createServiceClient()
    const { data } = await supabase
      .from('reviews')
      .select('id, title, body, rating_overall, created_at, landlord:landlords(display_name, city, state_abbr)')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(6)
    return data ?? []
  } catch {
    return []
  }
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3 w-3 ${i < rating ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200'}`}
        />
      ))}
    </div>
  )
}

export default async function HomePage() {
  const [stats, recentReviews] = await Promise.all([getStats(), getRecentReviews()])
  // Anchor cities for the hero pill row — the first 8 with the deepest
  // public-records coverage. Order is deliberate (NYC + Chicago lead).
  const priorityCities = [
    { city: 'New York', state: 'NY' },
    { city: 'Chicago', state: 'IL' },
    { city: 'Philadelphia', state: 'PA' },
    { city: 'Boston', state: 'MA' },
    { city: 'San Francisco', state: 'CA' },
    { city: 'Pittsburgh', state: 'PA' },
    { city: 'Baltimore', state: 'MD' },
    { city: 'State College', state: 'PA' },
  ]

  return (
    <div className="min-h-screen">
      {/* ── HERO ── */}
      <section className="relative isolate overflow-hidden bg-[#07111f] text-white">
        {/* Layered gradient mesh for depth */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_15%_-10%,rgba(15,123,108,0.22),transparent_55%),radial-gradient(ellipse_at_85%_110%,rgba(30,58,95,0.28),transparent_55%),radial-gradient(ellipse_at_50%_50%,rgba(20,184,166,0.06),transparent_70%)]" />
        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
            backgroundSize: '64px 64px',
            maskImage: 'radial-gradient(ellipse 60% 50% at 50% 40%, black 40%, transparent 80%)',
          }}
        />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

        <div className="relative mx-auto max-w-[1100px] px-6 pb-20 pt-16 lg:pb-28 lg:pt-24">
          <ScrollReveal delay={0} direction="up">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 backdrop-blur-sm">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-teal-400" />
              </span>
              <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-teal-200">
                Lease-verified renter intelligence
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={80} direction="up">
            <h1 className="mt-6 max-w-[740px] font-display text-[clamp(2.25rem,6.5vw,5.25rem)] leading-[1.02] tracking-tight">
              Know before
              <br />
              <span className="bg-gradient-to-r from-white via-teal-100 to-teal-300 bg-clip-text text-transparent">you rent.</span>
            </h1>
          </ScrollReveal>

          <ScrollReveal delay={160} direction="up">
            <p className="mt-6 max-w-[540px] text-[17px] leading-relaxed text-slate-300/90">
              Verified reviews and government records in one place,
              so you can sign with confidence.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={240} direction="up">
            <div className="mt-10 max-w-[560px]">
              <SearchBar size="lg" autoFocus variant="dark" />
              <div className="mt-4 flex flex-wrap gap-1.5">
                {priorityCities.map((city) => {
                  // Route to the dedicated city page (rich stats + activity
                  // feed) instead of /search?city=X&state=Y which only
                  // surfaces a filter view.
                  const slug = city.city.toLowerCase().replace(/\s+/g, '-')
                  return (
                    <Link
                      key={`${city.city}-${city.state}`}
                      href={`/city/${city.state.toLowerCase()}/${slug}`}
                      className="rounded-full bg-white/[0.06] px-3 py-1 text-[12px] text-slate-400 transition-colors hover:bg-white/[0.12] hover:text-slate-200"
                    >
                      {city.city}, {city.state}
                    </Link>
                  )
                })}
              </div>
            </div>
          </ScrollReveal>

          {/* Stats row — editorial magazine style. Always show all three. */}
          <ScrollReveal delay={320} direction="up">
            <div className="mt-16 grid grid-cols-1 gap-y-6 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-white/[0.08] border-t border-white/[0.08] pt-8">
              <div className="sm:pr-6">
                <p className="font-display text-[clamp(2rem,3.5vw,3.25rem)] leading-none tracking-tight text-white tabular-nums">
                  <AnimatedCounter target={stats.reviews} duration={2000} />
                </p>
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Verified reviews</p>
              </div>
              <div className="sm:px-6">
                <p className="font-display text-[clamp(2rem,3.5vw,3.25rem)] leading-none tracking-tight text-white tabular-nums">
                  <AnimatedCounter target={stats.landlords} duration={2000} />
                </p>
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Landlords tracked</p>
              </div>
              <div className="sm:pl-6">
                <p className="font-display text-[clamp(2rem,3.5vw,3.25rem)] leading-none tracking-tight text-white tabular-nums">
                  <AnimatedCounter target={stats.records} duration={2000} />
                </p>
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Public records</p>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="bg-white">
        <div className="mx-auto max-w-[1100px] px-6 py-20 lg:py-28">
          <ScrollReveal>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-600">The process</p>
            <h2 className="mt-3 font-display text-[clamp(1.8rem,3.5vw,2.8rem)] leading-[1.05] tracking-tight text-slate-900">
              Research a landlord
              <br />
              <span className="italic text-slate-400">in minutes.</span>
            </h2>
            <p className="mt-4 max-w-[480px] text-[15px] leading-relaxed text-slate-500">
              Search, scan the signal, and move forward with clarity.
            </p>
          </ScrollReveal>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {[
              { num: '01', title: 'Search your landlord', desc: 'By name, management company, or property address.' },
              { num: '02', title: 'See the full picture', desc: 'Lease-verified reviews and government records side by side.' },
              { num: '03', title: 'Decide with confidence', desc: 'Sign knowing exactly what you\'re getting into.' },
            ].map(({ num, title, desc }, idx) => (
              <ScrollReveal key={num} delay={idx * 100} direction="up">
                <div className="group relative h-full rounded-2xl border border-slate-200 bg-white p-7 transition-all duration-300 hover:border-teal-300 hover:shadow-[0_8px_32px_-12px_rgba(15,123,108,0.25)]">
                  <span className="absolute -top-5 left-7 rounded-full border border-slate-200 bg-white px-3 py-1 font-display text-[13px] tracking-wider text-teal-600">
                    {num}
                  </span>
                  <h3 className="mt-3 font-display text-[22px] leading-tight tracking-tight text-slate-900">{title}</h3>
                  <p className="mt-3 text-[14px] leading-relaxed text-slate-500">{desc}</p>
                  <div className="mt-6 h-px w-full bg-gradient-to-r from-teal-200 via-slate-100 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHAT MAKES VETT DIFFERENT ── */}
      <section className="relative border-t border-slate-100 bg-slate-50 overflow-hidden">
        {/* Editorial rule marks */}
        <div className="absolute inset-x-0 top-0 mx-auto max-w-[1100px] px-6">
          <div className="flex h-8 items-center justify-between text-[10px] font-mono uppercase tracking-widest text-slate-300">
            <span>§ 02</span>
            <span>What makes Vett different</span>
          </div>
        </div>

        <div className="mx-auto max-w-[1100px] px-6 py-24 lg:py-32">
          <div className="grid gap-16 lg:grid-cols-[1fr_1.1fr] lg:items-start">
            <ScrollReveal direction="left">
              <div className="lg:sticky lg:top-28">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-600">The signal</p>
                <h2 className="mt-3 font-display text-[clamp(1.8rem,3.5vw,3rem)] leading-[1.02] tracking-tight text-slate-900">
                  The signal renters
                  <br />
                  <span className="italic text-slate-400">actually need.</span>
                </h2>
                <p className="mt-5 max-w-[420px] text-[15px] leading-relaxed text-slate-600">
                  Public surface stays calm and readable. The data underneath stays dense, trustworthy, and current.
                </p>

                <div className="mt-10 grid grid-cols-2 gap-0 divide-x divide-slate-200">
                  <div className="pr-6">
                    <p className="font-display text-[clamp(2.25rem,3vw,3rem)] leading-none tracking-tight text-slate-900 tabular-nums">
                      <AnimatedCounter target={stats.cities} suffix="+" />
                    </p>
                    <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Cities covered</p>
                  </div>
                  <div className="pl-6">
                    <p className="font-display text-[clamp(2.25rem,3vw,3rem)] leading-none tracking-tight text-slate-900">100%</p>
                    <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Lease-verified</p>
                  </div>
                </div>
              </div>
            </ScrollReveal>

            <div className="flex flex-col gap-5">
              {[
                {
                  icon: Shield,
                  number: '01',
                  title: 'Lease-verified reviews',
                  description: 'Every published review is backed by a real lease document and founder review. No fake reviews, just real tenant experiences.',
                  accent: 'bg-teal-500',
                  glow: 'from-teal-500/10 via-transparent',
                  iconBg: 'bg-teal-50 ring-teal-100',
                  iconColor: 'text-teal-600',
                },
                {
                  icon: FileText,
                  number: '02',
                  title: 'Public records database',
                  description: 'Court cases, HPD violations, eviction filings, and code enforcement pulled daily from government databases.',
                  accent: 'bg-navy-500',
                  glow: 'from-navy-500/10 via-transparent',
                  iconBg: 'bg-navy-50 ring-navy-100',
                  iconColor: 'text-navy-600',
                },
                {
                  icon: Globe,
                  number: '03',
                  title: 'Growing city coverage',
                  description: 'Strongest where we have verified reviews and live public-data feeds — NYC, Chicago, Philadelphia, Baltimore, Pittsburgh, Boston, and more.',
                  accent: 'bg-slate-500',
                  glow: 'from-slate-500/10 via-transparent',
                  iconBg: 'bg-slate-100 ring-slate-200',
                  iconColor: 'text-slate-700',
                },
              ].map(({ icon: Icon, number, title, description, accent, glow, iconBg, iconColor }, idx) => (
                <ScrollReveal key={title} delay={idx * 100} direction="right">
                  <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-7 transition-all duration-300 hover:border-slate-300 hover:shadow-[0_16px_40px_-16px_rgba(15,23,42,0.15)]">
                    {/* Hover glow */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${glow} opacity-0 transition-opacity duration-500 group-hover:opacity-100`} />
                    <div className="relative">
                      <div className="flex items-start gap-5">
                        <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${iconBg} ring-1`}>
                          <Icon className={`h-5 w-5 ${iconColor}`} aria-hidden="true" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-3">
                            <span className="font-mono text-[11px] font-semibold tracking-widest text-slate-300">{number}</span>
                            <h3 className="font-display text-[20px] leading-tight tracking-tight text-slate-900">{title}</h3>
                          </div>
                          <p className="mt-2.5 text-[14.5px] leading-relaxed text-slate-600">{description}</p>
                        </div>
                      </div>
                      <div className={`absolute top-0 right-0 h-full w-1 ${accent} scale-y-0 origin-top transition-transform duration-500 group-hover:scale-y-100`} />
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── RECENT REVIEWS ── Only show when we have enough to fill the grid */}
      {recentReviews.length >= 3 && (
        <section className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-[1100px] px-6 py-20 lg:py-28">
            <div className="flex items-end justify-between gap-4 mb-10">
              <div>
                <h2 className="font-display text-[clamp(1.6rem,3vw,2.4rem)] leading-[1.15] tracking-tight text-slate-900">
                  Recent verified reviews
                </h2>
                <p className="mt-2 text-[15px] text-slate-500">
                  Real experiences from tenants with verified leases.
                </p>
              </div>
              <Link href="/search" className="group hidden items-center gap-1.5 text-[13px] font-medium text-navy-600 hover:text-navy-800 sm:inline-flex">
                Browse all <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {recentReviews.slice(0, 6).map((review: any) => (
                <div
                  key={review.id}
                  className="group border border-slate-200 bg-white p-5 rounded-lg transition-[border-color,box-shadow] duration-200 hover:border-slate-300 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold text-slate-900 line-clamp-1">{review.title}</p>
                      <p className="mt-1.5 text-[13px] leading-relaxed text-slate-500 line-clamp-3">{review.body}</p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <StarDisplay rating={review.rating_overall} />
                      <p className="mt-1 text-[11px] text-slate-400">
                        {new Date(review.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3 text-[12px] text-slate-500">
                    <Building2 className="h-3.5 w-3.5 text-slate-400" />
                    <span className="truncate">
                      {review.landlord?.display_name ?? 'Unknown'}
                      {review.landlord?.city && <span className="text-slate-400"> · {review.landlord.city}</span>}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 text-center sm:hidden">
              <Link href="/search" className="text-[13px] font-medium text-navy-600 hover:text-navy-800">
                Browse all reviews →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── CTAs ── */}
      <section className="bg-[#07111f] text-white">
        <div className="mx-auto grid max-w-[1100px] gap-px overflow-hidden bg-white/[0.06] px-0 md:grid-cols-2">
          <div className="bg-[#07111f] p-10 lg:p-14">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-400">For renters</p>
            <h2 className="mt-4 font-display text-[clamp(1.5rem,2.5vw,2rem)] leading-[1.2] tracking-tight">
              Had a landlord experience worth sharing?
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed text-slate-400">
              Publish a lease-verified review and help the next renter see the full picture.
            </p>
            <Button asChild size="sm" className="mt-7 bg-white text-slate-900 font-semibold hover:bg-slate-100 rounded-md h-10 px-5">
              <Link href="/review/new">
                Write a review <ArrowRight className="ml-2 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
          <div className="bg-teal-600 p-10 lg:p-14">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-100">Missing profiles</p>
            <h2 className="mt-4 font-display text-[clamp(1.5rem,2.5vw,2rem)] leading-[1.2] tracking-tight">
              Don&apos;t see your landlord yet?
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed text-teal-100/80">
              Submit a missing landlord so renters can start building a real record.
            </p>
            <Button asChild size="sm" className="mt-7 bg-white text-teal-700 font-semibold hover:bg-teal-50 rounded-md h-10 px-5">
              <Link href="/add-landlord">
                Add a landlord <ArrowRight className="ml-2 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── COLLEGE CITIES ── */}
      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-[1100px] px-6 py-20">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between mb-8">
            <div>
              <h2 className="font-display text-[clamp(1.5rem,2.5vw,2rem)] leading-[1.15] tracking-tight text-slate-900">
                Top college cities
              </h2>
              <p className="mt-1.5 text-[14px] text-slate-500">Search landlord reviews near your university.</p>
            </div>
            <Link href="/search" className="group inline-flex items-center gap-1 text-[13px] font-medium text-navy-600 hover:text-navy-800">
              All cities <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
            {COLLEGE_CITIES.slice(0, 8).map(({ city, state }) => (
              <Link
                key={`${city}-${state}`}
                href={`/city/${state.toLowerCase()}/${city.toLowerCase().replace(/\s+/g, '-')}`}
                className="group flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-4 py-3.5 text-[13px] font-medium text-slate-700 transition-[border-color,color] duration-200 hover:border-teal-400 hover:text-teal-700"
              >
                <span className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-slate-400 transition-colors group-hover:text-teal-500" />
                  {city}, {state}
                </span>
                <ArrowRight className="h-3 w-3 text-slate-300 transition-[color,transform] duration-200 group-hover:text-teal-500 group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>

          {/* City alert signup — visitor picks a city + state + email and we
              save it to email_leads for follow-up. */}
          <div className="mt-14 max-w-2xl">
            <CityAlertSignup
              theme="light"
              source="homepage-city-alerts"
              heading="Get city alerts"
              description="Tell us where you’re looking. We’ll email you when new lease-verified reviews land for that city — no account required."
            />
          </div>
          {/* Fallback newsletter signup for visitors who don't want to pick a
              specific city yet. */}
          <div className="mt-8 max-w-xl">
            <NewsletterSignup
              theme="light"
              source="homepage-cities"
              heading="Don’t know your city yet?"
              description="Drop your email and we'll let you know the moment Vett covers your area."
            />
          </div>
        </div>
      </section>
    </div>
  )
}
