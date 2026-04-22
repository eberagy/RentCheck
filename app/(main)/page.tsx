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
  Users,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { SearchBar } from '@/components/search/SearchBar'
import { ScrollReveal } from '@/components/ui/ScrollReveal'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import { GradientBlob } from '@/components/ui/GradientBlob'
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

const FEATURES = [
  {
    icon: Shield,
    title: 'Lease-Verified Reviews',
    description:
      'Every published review is backed by a real lease document and founder review. No fake reviews, just real tenant experiences you can trust.',
    color: 'text-teal-600',
    bg: 'bg-gradient-to-br from-teal-50 to-emerald-50/50',
    iconBg: 'bg-teal-100',
    border: 'border-teal-200/60',
    glow: 'group-hover:shadow-teal-100/50',
  },
  {
    icon: FileText,
    title: 'Public Records Database',
    description:
      'Court cases, HPD violations, eviction filings, and code enforcement, pulled daily from government databases.',
    color: 'text-navy-600',
    bg: 'bg-gradient-to-br from-sky-50 to-blue-50/50',
    iconBg: 'bg-sky-100',
    border: 'border-sky-200/60',
    glow: 'group-hover:shadow-sky-100/50',
  },
  {
    icon: Globe,
    title: 'Growing City Coverage',
    description:
      'Coverage is strongest where we have verified reviews and live public-data feeds, including NYC, Chicago, Philadelphia, Baltimore, Pittsburgh, Boston, Seattle, LA, Austin, and more.',
    color: 'text-violet-600',
    bg: 'bg-gradient-to-br from-violet-50 to-indigo-50/50',
    iconBg: 'bg-violet-100',
    border: 'border-violet-200/60',
    glow: 'group-hover:shadow-violet-100/50',
  },
]

const HOW_IT_WORKS = [
  { step: '01', title: 'Search your landlord', desc: 'Search by name, management company, or property address.', icon: Zap },
  { step: '02', title: 'See the full picture', desc: 'Read lease-verified reviews and government violation records side-by-side.', icon: TrendingUp },
  { step: '03', title: 'Make a confident decision', desc: 'Sign knowing exactly what you are getting into.', icon: CheckCircle },
]

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i < rating ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'}`}
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
    <div className="min-h-screen bg-[#07111f] text-white">
      {/* ── HERO ── */}
      <section className="relative isolate overflow-hidden border-b border-white/10">
        {/* Background layers */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(94,148,255,0.20),transparent_34%),radial-gradient(circle_at_85%_15%,rgba(45,212,191,0.16),transparent_28%),linear-gradient(180deg,#0d1728_0%,#07111f_45%,#06101c_100%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.15] to-transparent" />

        {/* Animated blobs */}
        <GradientBlob color="teal" size="lg" className="-left-32 top-20 opacity-40" />
        <GradientBlob color="blue" size="md" className="right-10 top-10 opacity-30" />
        <GradientBlob color="purple" size="sm" className="left-1/3 bottom-10 opacity-20" />

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />

        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-12 lg:grid-cols-[1.02fr_.98fr] lg:px-6 lg:py-20">
          <div className="flex flex-col justify-center pt-4 lg:pt-10">
            <ScrollReveal delay={0} direction="up">
              <div className="inline-flex w-fit items-center gap-3 rounded-full border border-white/[0.12] bg-white/[0.08] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300 backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-teal-400" />
                </span>
                Lease-verified renter intelligence
              </div>
            </ScrollReveal>

            <ScrollReveal delay={100} direction="up">
              <h1 className="mt-7 max-w-3xl text-5xl font-black tracking-tight text-balance sm:text-6xl lg:text-7xl">
                Know before
                <br />
                <span className="bg-gradient-to-r from-white via-slate-100 to-teal-200 bg-clip-text text-transparent">
                  you rent.
                </span>
              </h1>
            </ScrollReveal>

            <ScrollReveal delay={200} direction="up">
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-300 sm:text-xl">
                Vett brings lease-verified reviews and government records into one calm, searchable surface so renters can make a confident decision faster.
              </p>
            </ScrollReveal>

            <ScrollReveal delay={300} direction="up">
              <div className="mt-7 flex flex-wrap gap-3">
                <Button
                  asChild
                  size="sm"
                  className="group h-11 rounded-full bg-white px-6 text-sm font-semibold text-slate-900 shadow-lg shadow-white/10 transition-[background-color,box-shadow] duration-200 hover:bg-slate-100 hover:shadow-xl hover:shadow-white/20"
                >
                  <Link href="/search">
                    Explore landlords <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="h-11 rounded-full border-white/15 bg-white/5 px-6 text-sm font-semibold text-white backdrop-blur-sm transition-[background-color,border-color] duration-200 hover:bg-white/10 hover:border-white/25"
                >
                  <Link href="/review/new">Write a review</Link>
                </Button>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={400} direction="up">
              <div className="mt-9 max-w-2xl">
                <SearchBar size="lg" autoFocus variant="dark" />
                <p className="mt-3 text-sm text-slate-400">
                  Search by landlord, management company, address, or city.
                </p>
                <div className="mt-5 flex flex-wrap gap-2 stagger-children">
                  {priorityCities.map((city) => (
                    <Link
                      key={`${city.city}-${city.state}`}
                      href={`/search?city=${encodeURIComponent(city.city)}&state=${city.state}`}
                      className="rounded-full border border-white/[0.12] bg-white/[0.06] px-3.5 py-1.5 text-xs font-medium text-slate-200 backdrop-blur-sm transition-[border-color,background-color,color,transform] duration-200 hover:border-teal-300/40 hover:bg-white/[0.12] hover:text-white hover:scale-[1.03]"
                    >
                      {city.city}, {city.state}
                    </Link>
                  ))}
                </div>
              </div>
            </ScrollReveal>
          </div>

          {/* Right side — stats + live feed */}
          <div className="relative flex items-center">
            <GradientBlob color="teal" size="sm" className="-left-8 top-8 opacity-40" />
            <GradientBlob color="blue" size="md" className="bottom-0 right-2 opacity-30" />

            <ScrollReveal delay={300} direction="right" className="w-full">
              <div className="relative w-full rounded-[2rem] border border-white/[0.12] bg-white/[0.06] p-5 shadow-[0_30px_120px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Live snapshot</p>
                    <p className="mt-1 text-sm text-slate-200">Recent activity across trusted renter signals</p>
                  </div>
                  <div className="flex items-center gap-2 rounded-full border border-teal-300/[0.20] bg-teal-400/[0.10] px-3 py-1 text-xs font-semibold text-teal-200">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-75" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-teal-400" />
                    </span>
                    Live
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 py-5">
                  {[
                    { icon: Star, label: 'Verified reviews', value: stats.reviews, color: 'text-teal-300' },
                    { icon: Building2, label: 'Landlords tracked', value: stats.landlords, color: 'text-sky-300' },
                    { icon: AlertTriangle, label: 'Public records', value: stats.records, color: 'text-rose-300' },
                  ].map(({ icon: Icon, label, value, color }) => (
                    <div key={label} className="group rounded-2xl border border-white/10 bg-white/[0.05] p-4 transition-[background-color,border-color] duration-200 hover:bg-white/[0.08] hover:border-white/20">
                      <Icon className={`h-4 w-4 ${color} transition-transform group-hover:scale-110`} />
                      <div className="mt-3 text-2xl font-bold">
                        <AnimatedCounter target={value} duration={2200} />
                      </div>
                      <p className="mt-1 text-xs text-slate-400">{label}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-3 border-t border-white/10 pt-4">
                  {recentReviews.slice(0, 3).map((review: any, idx: number) => (
                    <div
                      key={review.id}
                      className="rounded-2xl border border-white/10 bg-[#0a1524]/90 p-4 transition-[background-color,border-color] duration-200 hover:border-white/20 hover:bg-[#0c1a2e]/90"
                      style={{ animationDelay: `${idx * 100}ms` }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white line-clamp-1">{review.title}</p>
                          <p className="mt-1 text-xs text-slate-400 line-clamp-2">{review.body}</p>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <StarDisplay rating={review.rating_overall} />
                          <p className="mt-1 text-[11px] text-slate-500">
                            {new Date(review.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                        <Building2 className="h-3.5 w-3.5" />
                        <span>
                          {review.landlord?.display_name ?? 'Unknown'}
                          {review.landlord?.city && <span className="text-slate-500"> · {review.landlord.city}</span>}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── TRUST STRIP ── */}
      {(stats.reviews > 0 || stats.landlords > 0) && (
        <section className="border-b border-white/10 bg-white/[0.03]">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5 lg:px-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
                <CheckCircle className="h-4.5 w-4.5 text-teal-300" />
              </div>
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Trust</div>
                <p className="text-sm text-slate-300">
                  Lease verification, review moderation, and public-record context in one place.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-6 text-sm text-slate-300">
              <span className="inline-flex items-center gap-2">
                <span className="text-xl font-bold text-white">
                  <AnimatedCounter target={stats.reviews} duration={1800} />
                </span>
                verified reviews
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="text-xl font-bold text-white">
                  <AnimatedCounter target={stats.landlords} duration={1800} />
                </span>
                landlords tracked
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="text-xl font-bold text-white">
                  <AnimatedCounter target={stats.records} duration={1800} />
                </span>
                public records
              </span>
            </div>
          </div>
        </section>
      )}

      {/* ── HOW IT WORKS ── */}
      <section className="relative border-b border-slate-200/10 bg-white text-slate-900 overflow-hidden">
        {/* Subtle background decoration */}
        <div className="absolute top-0 right-0 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-teal-50 to-transparent opacity-60 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-gradient-to-tr from-sky-50 to-transparent opacity-50 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 py-24 lg:px-6">
          <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
            <ScrollReveal direction="left">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3.5 py-1.5 text-xs font-semibold text-teal-700">
                  <Zap className="h-3 w-3" />
                  Simple process
                </div>
                <h2 className="mt-5 max-w-xl text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
                  Research a landlord in{' '}
                  <span className="gradient-text">minutes</span>, not hours.
                </h2>
                <p className="mt-5 max-w-md text-base leading-relaxed text-slate-600">
                  The product should feel quick to trust. Search, scan the signal, and move forward with clarity.
                </p>
              </div>
            </ScrollReveal>
            <div className="grid gap-5 md:grid-cols-3">
              {HOW_IT_WORKS.map(({ step, title, desc, icon: StepIcon }, idx) => (
                <ScrollReveal key={step} delay={idx * 120} direction="up">
                  <div className="group relative rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-2 hover:border-slate-300 hover:shadow-[0_20px_50px_rgba(15,23,42,0.10)]">
                    {/* Connector line on desktop */}
                    {idx < 2 && (
                      <div className="absolute -right-3 top-1/2 hidden h-px w-6 bg-slate-200 md:block" />
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 text-sm font-bold text-slate-400 shadow-inner">
                        {step}
                      </div>
                      <StepIcon className="h-5 w-5 text-teal-500 opacity-60 transition-[opacity,transform] duration-200 group-hover:opacity-100 group-hover:scale-110" />
                    </div>
                    <h3 className="mt-5 text-lg font-semibold text-slate-950">{title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{desc}</p>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── WHY VETT ── */}
      <section className="relative border-b border-white/10 bg-[#07111f] overflow-hidden">
        <GradientBlob color="teal" size="lg" className="right-0 top-20 opacity-20" />
        <GradientBlob color="blue" size="md" className="left-0 bottom-20 opacity-15" />

        <div className="relative mx-auto max-w-7xl px-4 py-24 lg:px-6">
          <div className="grid gap-10 lg:grid-cols-[.95fr_1.05fr] lg:items-start">
            <ScrollReveal direction="left">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-teal-300/20 bg-teal-400/10 px-3.5 py-1.5 text-xs font-semibold text-teal-300">
                  <Shield className="h-3 w-3" />
                  Why Vett
                </div>
                <h2 className="mt-5 max-w-xl text-4xl font-bold tracking-tight text-white sm:text-5xl">
                  Everything you need to make a{' '}
                  <span className="bg-gradient-to-r from-teal-200 to-teal-400 bg-clip-text text-transparent">
                    confident decision
                  </span>.
                </h2>
                <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300">
                  The public surface stays calm and readable while the signal underneath stays dense, trustworthy, and current.
                </p>
                <div className="mt-8 grid grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <Users className="h-5 w-5 text-teal-300" />
                    <p className="mt-3 text-2xl font-bold text-white">
                      <AnimatedCounter target={21} suffix="+" />
                    </p>
                    <p className="mt-1 text-xs text-slate-400">Cities covered</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <Shield className="h-5 w-5 text-sky-300" />
                    <p className="mt-3 text-2xl font-bold text-white">100%</p>
                    <p className="mt-1 text-xs text-slate-400">Lease-verified</p>
                  </div>
                </div>
              </div>
            </ScrollReveal>
            <div className="grid gap-4">
              {FEATURES.map(({ icon: Icon, title, description, color, bg, iconBg, border, glow }, idx) => (
                <ScrollReveal key={title} delay={idx * 120} direction="right">
                  <div
                    className={`group rounded-[1.5rem] border ${border} ${bg} p-6 transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)] ${glow}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${iconBg} shadow-sm transition-transform duration-300 group-hover:scale-110`}>
                        <Icon className={`h-5 w-5 ${color}`} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base font-semibold text-gray-950">{title}</h3>
                        <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{description}</p>
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
        <section className="relative border-b border-slate-200/10 bg-white text-slate-900 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(248,250,252,1)_0%,rgba(255,255,255,1)_100%)]" />
          <div className="relative mx-auto max-w-7xl px-4 py-24 lg:px-6">
            <ScrollReveal>
              <div className="mb-10 flex items-end justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3.5 py-1.5 text-xs font-semibold text-amber-700">
                    <Star className="h-3 w-3 fill-current" />
                    Community
                  </div>
                  <h2 className="mt-5 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
                    Recent lease-verified reviews
                  </h2>
                  <p className="mt-3 max-w-lg text-base text-slate-600">
                    Real experiences from real tenants, each backed by a verified lease document.
                  </p>
                </div>
                <Link href="/search" className="group hidden items-center gap-1.5 text-sm font-medium text-navy-700 hover:text-navy-900 sm:inline-flex">
                  Browse all <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </ScrollReveal>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {recentReviews.slice(0, 6).map((review: any, idx: number) => (
                <ScrollReveal key={review.id} delay={idx * 80} direction="up">
                  <div className="group h-full rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1.5 hover:border-slate-300 hover:shadow-[0_20px_60px_rgba(15,23,42,0.10)]">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-950 line-clamp-1 group-hover:text-navy-700 transition-colors">
                          {review.title}
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-slate-600 line-clamp-3">{review.body}</p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <StarDisplay rating={review.rating_overall} />
                        <p className="mt-1 text-[11px] text-slate-400">
                          {new Date(review.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100">
                        <Building2 className="h-3.5 w-3.5 text-slate-400" />
                      </div>
                      <span className="truncate">
                        {review.landlord?.display_name ?? 'Unknown'}
                        {review.landlord?.city && <span className="text-slate-400"> · {review.landlord.city}</span>}
                      </span>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
            <div className="mt-8 text-center sm:hidden">
              <Link href="/search" className="inline-flex items-center gap-1.5 text-sm font-medium text-navy-700 hover:text-navy-900">
                Browse all reviews <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── DUAL CTA ── */}
      <section className="relative bg-[#07111f] px-4 py-24 text-white overflow-hidden">
        <GradientBlob color="teal" size="lg" className="left-1/4 top-0 opacity-15" />
        <div className="relative mx-auto grid max-w-7xl gap-6 lg:grid-cols-2 lg:px-2">
          <ScrollReveal delay={0} direction="left">
            <div className="group relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#10203b] via-[#0d1930] to-[#09131f] p-8 transition-[border-color,box-shadow] duration-300 hover:border-white/20 hover:shadow-[0_30px_80px_rgba(0,0,0,0.4)]">
              <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/[0.04] blur-3xl transition-[background-color] duration-300 group-hover:bg-white/[0.07]" />
              <div className="absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-300">For renters</p>
              <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">Had a landlord experience worth sharing?</h2>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-300">
                Publish a lease-verified review and help the next renter see the full picture before they sign.
              </p>
              <Button asChild size="sm" className="group/btn mt-6 bg-white text-navy-950 font-semibold shadow-lg shadow-white/10 hover:bg-slate-100">
                <Link href="/review/new">
                  Write a Review <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-0.5" />
                </Link>
              </Button>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={150} direction="right">
            <div className="group relative overflow-hidden rounded-[2rem] border border-teal-300/[0.20] bg-gradient-to-br from-teal-600 to-teal-500 p-8 text-white transition-[box-shadow] duration-300 hover:shadow-[0_30px_80px_rgba(15,123,108,0.3)]">
              <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/[0.08] blur-3xl transition-[background-color] duration-300 group-hover:bg-white/[0.12]" />
              <div className="absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-100">For missing profiles</p>
              <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">Don&apos;t see your landlord yet?</h2>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-teal-50/90">
                Submit a missing landlord so the profile exists, the information stays organized, and renters can start building a real record.
              </p>
              <Button asChild size="sm" className="group/btn mt-6 bg-white text-teal-700 font-semibold shadow-lg hover:bg-teal-50">
                <Link href="/add-landlord">
                  Add a Landlord <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-0.5" />
                </Link>
              </Button>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── COLLEGE CITIES ── */}
      <section className="relative bg-white px-4 py-20 text-slate-900 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(248,250,252,0.8)_0%,rgba(255,255,255,1)_100%)]" />
        <div className="relative mx-auto max-w-7xl lg:px-2">
          <ScrollReveal>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-semibold text-slate-600">
                  <MapPin className="h-3 w-3 text-teal-600" />
                  Campus coverage
                </div>
                <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Top College Cities</h2>
                <p className="mt-2 text-base text-slate-500">Search landlord reviews near your university.</p>
              </div>
              <Link href="/search" className="group inline-flex items-center gap-1 text-sm font-medium text-navy-700 hover:text-navy-900">
                View all cities <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </ScrollReveal>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {COLLEGE_CITIES.slice(0, 8).map(({ city, state }, idx) => (
              <ScrollReveal key={`${city}-${state}`} delay={idx * 60} direction="up">
                <Link
                  href={`/city/${state.toLowerCase()}/${city.toLowerCase().replace(/\s+/g, '-')}`}
                  className="group flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-700 shadow-sm transition-[transform,box-shadow,border-color,color] duration-300 hover:-translate-y-1 hover:border-teal-300 hover:text-teal-700 hover:shadow-[0_14px_35px_rgba(15,23,42,0.08)]"
                >
                  <span className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 transition-colors group-hover:text-teal-500" />
                    {city}, {state}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-300 transition-[color,transform] duration-200 group-hover:text-teal-500 group-hover:translate-x-0.5" />
                </Link>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
