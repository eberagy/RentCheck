import Link from 'next/link'
import type { Metadata } from 'next'
import {
  Shield,
  FileText,
  Globe,
  ArrowRight,
  Star,
  AlertTriangle,
  CheckCircle,
  Building2,
  MapPin,
} from 'lucide-react'
import { SearchBar } from '@/components/search/SearchBar'
import { ScrollReveal } from '@/components/ui/ScrollReveal'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import { Button } from '@/components/ui/button'
import { createServiceClient } from '@/lib/supabase/server'
import { COLLEGE_CITIES } from '@/types'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Vett — Know Before You Rent',
  description:
    'Lease-verified renter reviews and public records on landlords in major cities and growing coverage nationwide. Know before you rent.',
}

async function getStats() {
  try {
    const supabase = createServiceClient()
    const [{ count: reviewCount }, { count: landlordCount }, { count: recordCount }] = await Promise.all([
      supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
      supabase.from('landlords').select('*', { count: 'exact', head: true }),
      supabase.from('public_records').select('*', { count: 'exact', head: true }),
    ])
    return { reviews: reviewCount ?? 0, landlords: landlordCount ?? 0, records: recordCount ?? 0 }
  } catch {
    return { reviews: 0, landlords: 0, records: 0 }
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
  const priorityCities = COLLEGE_CITIES.filter((city) =>
    ['Baltimore', 'Pittsburgh', 'State College', 'Philadelphia', 'New York', 'Chicago'].includes(city.city)
  )

  return (
    <div className="min-h-screen">
      {/* ── HERO ── */}
      <section className="relative isolate overflow-hidden bg-[#07111f] text-white">
        {/* Subtle static gradient — no animated blobs */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(15,123,108,0.15),transparent_50%),radial-gradient(ellipse_at_80%_100%,rgba(30,58,95,0.12),transparent_50%)]" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

        <div className="relative mx-auto max-w-[1100px] px-6 pb-20 pt-16 lg:pb-28 lg:pt-24">
          <ScrollReveal delay={0} direction="up">
            <p className="text-[13px] font-medium tracking-wide text-teal-400/90">
              Lease-verified renter intelligence
            </p>
          </ScrollReveal>

          <ScrollReveal delay={80} direction="up">
            <h1 className="mt-5 max-w-[680px] font-display text-[clamp(2.8rem,6vw,5rem)] leading-[1.05] tracking-tight">
              Know before
              <br />
              you rent.
            </h1>
          </ScrollReveal>

          <ScrollReveal delay={160} direction="up">
            <p className="mt-6 max-w-[520px] text-[17px] leading-relaxed text-slate-400">
              Verified reviews and government records in one place,
              so you can sign with confidence.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={240} direction="up">
            <div className="mt-10 max-w-[560px]">
              <SearchBar size="lg" autoFocus variant="dark" />
              <div className="mt-5 flex flex-wrap gap-2">
                {priorityCities.map((city) => (
                  <Link
                    key={`${city.city}-${city.state}`}
                    href={`/search?city=${encodeURIComponent(city.city)}&state=${city.state}`}
                    className="rounded-md border border-white/[0.08] px-3 py-1.5 text-[12px] text-slate-500 transition-colors hover:border-white/15 hover:text-slate-300"
                  >
                    {city.city}, {city.state}
                  </Link>
                ))}
              </div>
            </div>
          </ScrollReveal>

          {/* Stats row — inline, not cards */}
          {(stats.reviews > 0 || stats.landlords > 0) && (
            <ScrollReveal delay={320} direction="up">
              <div className="mt-14 flex flex-wrap items-center gap-x-10 gap-y-3 border-t border-white/[0.06] pt-7">
                <div>
                  <span className="text-2xl font-bold text-white tabular-nums">
                    <AnimatedCounter target={stats.reviews} duration={2000} />
                  </span>
                  <span className="ml-2 text-[13px] text-slate-500">verified reviews</span>
                </div>
                <div>
                  <span className="text-2xl font-bold text-white tabular-nums">
                    <AnimatedCounter target={stats.landlords} duration={2000} />
                  </span>
                  <span className="ml-2 text-[13px] text-slate-500">landlords tracked</span>
                </div>
                <div>
                  <span className="text-2xl font-bold text-white tabular-nums">
                    <AnimatedCounter target={stats.records} duration={2000} />
                  </span>
                  <span className="ml-2 text-[13px] text-slate-500">public records</span>
                </div>
              </div>
            </ScrollReveal>
          )}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="bg-white">
        <div className="mx-auto max-w-[1100px] px-6 py-20 lg:py-28">
          <ScrollReveal>
            <h2 className="font-display text-[clamp(1.8rem,3.5vw,2.8rem)] leading-[1.15] tracking-tight text-slate-900">
              Research a landlord in minutes.
            </h2>
            <p className="mt-3 max-w-[480px] text-[15px] leading-relaxed text-slate-500">
              Search, scan the signal, and move forward with clarity.
            </p>
          </ScrollReveal>

          <div className="mt-12 grid gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 md:grid-cols-3">
            {[
              { num: '1', title: 'Search your landlord', desc: 'By name, management company, or property address.' },
              { num: '2', title: 'See the full picture', desc: 'Lease-verified reviews and government records side by side.' },
              { num: '3', title: 'Decide with confidence', desc: 'Sign knowing exactly what you\'re getting into.' },
            ].map(({ num, title, desc }) => (
              <div key={num} className="bg-white p-7 lg:p-9">
                <span className="text-[13px] font-semibold text-teal-600">{num}</span>
                <h3 className="mt-3 text-[16px] font-semibold text-slate-900">{title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-slate-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHAT MAKES VETT DIFFERENT ── */}
      <section className="border-t border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-[1100px] px-6 py-20 lg:py-28">
          <div className="grid gap-16 lg:grid-cols-[1fr_1.1fr] lg:items-start">
            <ScrollReveal direction="left">
              <div className="lg:sticky lg:top-28">
                <h2 className="font-display text-[clamp(1.8rem,3.5vw,2.8rem)] leading-[1.15] tracking-tight text-slate-900">
                  The signal renters
                  <br />
                  actually need.
                </h2>
                <p className="mt-4 max-w-[420px] text-[15px] leading-relaxed text-slate-500">
                  Public surface stays calm and readable. The data underneath stays dense, trustworthy, and current.
                </p>

                <div className="mt-8 flex gap-5">
                  <div>
                    <p className="text-3xl font-bold text-slate-900 tabular-nums">
                      <AnimatedCounter target={21} suffix="+" />
                    </p>
                    <p className="mt-0.5 text-[13px] text-slate-500">Cities covered</p>
                  </div>
                  <div className="border-l border-slate-200 pl-5">
                    <p className="text-3xl font-bold text-slate-900">100%</p>
                    <p className="mt-0.5 text-[13px] text-slate-500">Lease-verified</p>
                  </div>
                </div>
              </div>
            </ScrollReveal>

            <div className="flex flex-col gap-4">
              {[
                {
                  icon: Shield,
                  title: 'Lease-verified reviews',
                  description: 'Every published review is backed by a real lease document and founder review. No fake reviews, just real tenant experiences.',
                  accent: 'border-l-teal-500',
                  iconColor: 'text-teal-600',
                },
                {
                  icon: FileText,
                  title: 'Public records database',
                  description: 'Court cases, HPD violations, eviction filings, and code enforcement pulled daily from government databases.',
                  accent: 'border-l-navy-400',
                  iconColor: 'text-navy-600',
                },
                {
                  icon: Globe,
                  title: 'Growing city coverage',
                  description: 'Strongest where we have verified reviews and live public-data feeds — NYC, Chicago, Philadelphia, Baltimore, Pittsburgh, Boston, and more.',
                  accent: 'border-l-slate-400',
                  iconColor: 'text-slate-600',
                },
              ].map(({ icon: Icon, title, description, accent, iconColor }, idx) => (
                <ScrollReveal key={title} delay={idx * 100} direction="right">
                  <div className={`border-l-[3px] ${accent} bg-white py-5 pl-6 pr-5 rounded-r-lg`}>
                    <div className="flex items-start gap-3">
                      <Icon className={`mt-0.5 h-[18px] w-[18px] flex-shrink-0 ${iconColor}`} />
                      <div>
                        <h3 className="text-[15px] font-semibold text-slate-900">{title}</h3>
                        <p className="mt-1.5 text-[14px] leading-relaxed text-slate-500">{description}</p>
                      </div>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── RECENT REVIEWS ── */}
      {recentReviews.length > 0 && (
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
        </div>
      </section>
    </div>
  )
}
