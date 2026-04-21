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
import { Button } from '@/components/ui/button'
import { createServiceClient } from '@/lib/supabase/server'
import { COLLEGE_CITIES } from '@/types'

export const metadata: Metadata = {
  title: { absolute: 'Vett — Know Before You Rent' },
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
    bg: 'bg-teal-50',
    border: 'border-teal-100',
  },
  {
    icon: FileText,
    title: 'Public Records Database',
    description:
      'Court cases, HPD violations, eviction filings, and code enforcement, pulled daily from government databases.',
    color: 'text-navy-600',
    bg: 'bg-navy-50',
    border: 'border-navy-100',
  },
  {
    icon: Globe,
    title: 'Growing City Coverage',
    description:
      'Coverage is strongest where we have verified reviews and live public-data feeds, including NYC, Chicago, Philadelphia, Baltimore, Pittsburgh, Boston, Seattle, LA, Austin, and more.',
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    border: 'border-indigo-100',
  },
]

const HOW_IT_WORKS = [
  { step: '01', title: 'Search your landlord', desc: 'Search by name, management company, or property address.' },
  { step: '02', title: 'See the full picture', desc: 'Read lease-verified reviews and government violation records side-by-side.' },
  { step: '03', title: 'Make a confident decision', desc: 'Sign knowing exactly what you are getting into.' },
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
      <section className="relative isolate overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(94,148,255,0.20),transparent_34%),radial-gradient(circle_at_85%_15%,rgba(45,212,191,0.16),transparent_28%),linear-gradient(180deg,#0d1728_0%,#07111f_45%,#06101c_100%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.15] to-transparent" />

        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-10 lg:grid-cols-[1.02fr_.98fr] lg:px-6 lg:py-14">
          <div className="flex flex-col justify-center pt-4 lg:pt-10">
            <div className="inline-flex w-fit items-center gap-3 rounded-full border border-white/[0.12] bg-white/[0.08] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">
              <CheckCircle className="h-3.5 w-3.5 text-teal-300" />
              Lease-verified renter intelligence
            </div>

            <h1 className="mt-7 max-w-3xl text-5xl font-black tracking-tight text-balance sm:text-6xl lg:text-7xl">
              Know before
              <br />
              <span className="bg-gradient-to-r from-white via-slate-100 to-teal-200 bg-clip-text text-transparent">
                you rent.
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-300 sm:text-xl">
              Vett brings lease-verified reviews and government records into one calm, searchable surface so renters can make a confident decision faster.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Button
                asChild
                size="sm"
                className="h-11 rounded-full bg-white px-5 text-sm font-semibold text-slate-900 hover:bg-slate-100"
              >
                <Link href="/search">
                  Explore landlords <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="sm"
                variant="outline"
                className="h-11 rounded-full border-white/15 bg-white/5 px-5 text-sm font-semibold text-white hover:bg-white/10"
              >
                <Link href="/review/new">Write a review</Link>
              </Button>
            </div>

            <div className="mt-9 max-w-2xl">
              <div className="rounded-[1.5rem] border border-white/[0.12] bg-white p-2 shadow-[0_30px_90px_rgba(0,0,0,0.35)]">
                <SearchBar size="lg" autoFocus />
              </div>
              <p className="mt-3 text-sm text-slate-400">
                Search by landlord, management company, address, or city.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {priorityCities.map((city) => (
                  <Link
                    key={`${city.city}-${city.state}`}
                    href={`/search?city=${encodeURIComponent(city.city)}&state=${city.state}`}
                    className="rounded-full border border-white/[0.12] bg-white/[0.06] px-3.5 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-teal-300/40 hover:bg-white/[0.12] hover:text-white"
                  >
                    {city.city}, {city.state}
                  </Link>
                ))}
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Reviews</p>
                  <p className="mt-2 text-sm text-slate-200">
                    Every published review is lease-backed and founder-approved.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Records</p>
                  <p className="mt-2 text-sm text-slate-200">
                    Official violations, filings, and address history sit beside the reviews.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Coverage</p>
                  <p className="mt-2 text-sm text-slate-200">
                    Built around college-heavy renter markets first, then expanded city by city.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative flex items-center">
            <div className="absolute -left-8 top-8 h-24 w-24 rounded-full bg-teal-400/[0.15] blur-3xl" />
            <div className="absolute bottom-0 right-2 h-40 w-40 rounded-full bg-white/[0.10] blur-3xl" />

            <div className="relative w-full rounded-[2rem] border border-white/[0.12] bg-white/[0.08] p-5 shadow-[0_30px_120px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Live snapshot</p>
                  <p className="mt-1 text-sm text-slate-200">Recent activity across trusted renter signals</p>
                </div>
                <div className="rounded-full border border-teal-300/[0.20] bg-teal-400/[0.10] px-3 py-1 text-xs font-semibold text-teal-200">
                  Updated daily
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 py-5">
                <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                  <Star className="h-4 w-4 text-teal-300" />
                  <div className="mt-3 text-2xl font-bold">{stats.reviews.toLocaleString()}</div>
                  <p className="mt-1 text-xs text-slate-400">Verified reviews</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                  <Building2 className="h-4 w-4 text-sky-300" />
                  <div className="mt-3 text-2xl font-bold">{stats.landlords.toLocaleString()}</div>
                  <p className="mt-1 text-xs text-slate-400">Landlords tracked</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                  <AlertTriangle className="h-4 w-4 text-rose-300" />
                  <div className="mt-3 text-2xl font-bold">{stats.records.toLocaleString()}</div>
                  <p className="mt-1 text-xs text-slate-400">Public records</p>
                </div>
              </div>

              <div className="space-y-3 border-t border-white/10 pt-4">
                {recentReviews.slice(0, 3).map((review: any) => (
                  <div key={review.id} className="rounded-2xl border border-white/10 bg-[#0a1524]/90 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
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
          </div>
        </div>
      </section>

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
                <span className="text-xl font-bold text-white">{stats.reviews.toLocaleString()}</span>
                verified reviews
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="text-xl font-bold text-white">{stats.landlords.toLocaleString()}</span>
                landlords tracked
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="text-xl font-bold text-white">{stats.records.toLocaleString()}</span>
                public records
              </span>
            </div>
          </div>
        </section>
      )}

      <section className="border-b border-slate-200/10 bg-white text-slate-900">
        <div className="mx-auto max-w-7xl px-4 py-20 lg:px-6">
          <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-700">Simple process</p>
              <h2 className="mt-3 max-w-xl text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Research a landlord in minutes, not hours.
              </h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-600">
                The product should feel quick to trust. Search, scan the signal, and move forward with clarity.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {HOW_IT_WORKS.map(({ step, title, desc }) => (
                <div
                  key={step}
                  className="group rounded-[1.5rem] border border-slate-200 bg-slate-50/90 p-6 transition-all hover:-translate-y-1 hover:border-slate-300 hover:bg-white hover:shadow-[0_20px_50px_rgba(15,23,42,0.08)]"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">{step}</div>
                    <span className="h-2 w-2 rounded-full bg-teal-500 transition-transform duration-200 group-hover:scale-125" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-slate-950">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 bg-[#07111f]">
        <div className="mx-auto max-w-7xl px-4 py-20 lg:px-6">
          <div className="grid gap-8 lg:grid-cols-[.95fr_1.05fr] lg:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-300">Why Vett</p>
              <h2 className="mt-3 max-w-xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Everything you need to make a confident decision.
              </h2>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-300">
                The public surface stays calm and readable while the signal underneath stays dense, trustworthy, and current.
              </p>
            </div>
            <div className="grid gap-4">
              {FEATURES.map(({ icon: Icon, title, description, color, bg, border }) => (
                <div
                  key={title}
                  className={`rounded-[1.5rem] border ${border} ${bg} p-5 transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_50px_rgba(0,0,0,0.18)]`}
                >
                  <div className="flex items-start gap-4">
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm">
                      <Icon className={`h-5.5 w-5.5 ${color}`} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold text-gray-950">{title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-gray-600">{description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {recentReviews.length > 0 && (
        <section className="border-b border-slate-200/10 bg-white text-slate-900">
          <div className="mx-auto max-w-7xl px-4 py-20 lg:px-6">
            <div className="mb-8 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-700">Community</p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                  Recent lease-verified reviews
                </h2>
              </div>
              <Link href="/search" className="inline-flex items-center gap-1.5 text-sm font-medium text-navy-700 hover:text-navy-900">
                Browse all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {recentReviews.slice(0, 6).map((review: any) => (
                <div
                  key={review.id}
                  className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 transition-all hover:-translate-y-1 hover:border-slate-300 hover:bg-white hover:shadow-[0_18px_45px_rgba(15,23,42,0.08)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-950 line-clamp-1">{review.title}</p>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600 line-clamp-3">{review.body}</p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <StarDisplay rating={review.rating_overall} />
                      <p className="mt-1 text-[11px] text-slate-400">
                        {new Date(review.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2 border-t border-slate-200 pt-4 text-xs text-slate-500">
                    <Building2 className="h-3.5 w-3.5 text-slate-400" />
                    <span className="truncate">
                      {review.landlord?.display_name ?? 'Unknown'}
                      {review.landlord?.city && <span className="text-slate-400"> · {review.landlord.city}</span>}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="bg-[#07111f] px-4 py-20 text-white">
        <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-2 lg:px-2">
          <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-[#10203b] via-[#0d1930] to-[#09131f] p-8">
            <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/[0.05] blur-3xl" />
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-300">For renters</p>
            <h2 className="mt-4 text-2xl font-bold tracking-tight">Had a landlord experience worth sharing?</h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-300">
              Publish a lease-verified review and help the next renter see the full picture before they sign.
            </p>
            <Button asChild size="sm" className="mt-6 bg-white text-navy-950 font-semibold hover:bg-slate-100">
              <Link href="/review/new">
                Write a Review <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="relative overflow-hidden rounded-[1.75rem] border border-teal-300/[0.20] bg-gradient-to-br from-teal-600 to-teal-500 p-8 text-white">
            <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/[0.10] blur-3xl" />
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-100">For missing profiles</p>
            <h2 className="mt-4 text-2xl font-bold tracking-tight">Don&apos;t see your landlord yet?</h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-teal-50/90">
              Submit a missing landlord so the profile exists, the information stays organized, and renters can start building a real record.
            </p>
            <Button asChild size="sm" className="mt-6 bg-white text-teal-700 font-semibold hover:bg-teal-50">
              <Link href="/add-landlord">
                Add a Landlord <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-16 text-slate-900">
        <div className="mx-auto max-w-7xl lg:px-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-teal-600" />
                <h2 className="text-xl font-semibold tracking-tight text-slate-950">Top College Cities</h2>
              </div>
              <p className="mt-2 text-sm text-slate-500">Search landlord reviews near your university.</p>
            </div>
            <Link href="/search" className="text-sm font-medium text-navy-700 hover:text-navy-900">
              View all cities
            </Link>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {COLLEGE_CITIES.slice(0, 8).map(({ city, state }) => (
              <Link
                key={`${city}-${state}`}
                href={`/city/${state.toLowerCase()}/${city.toLowerCase().replace(/\s+/g, '-')}`}
                className="group rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-700 transition-all hover:-translate-y-0.5 hover:border-teal-300 hover:bg-white hover:text-teal-700 hover:shadow-[0_14px_35px_rgba(15,23,42,0.08)]"
              >
                <span className="flex items-center justify-between gap-3">
                  <span>
                    {city}, {state}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400 transition-colors group-hover:text-teal-500" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
