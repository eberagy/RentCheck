import Link from 'next/link'
import { Shield, FileText, Globe, ArrowRight, Star, AlertTriangle, Search, CheckCircle, Building2, Users, MapPin, TrendingUp, Scale } from 'lucide-react'
import { SearchBar } from '@/components/search/SearchBar'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'
import { COLLEGE_CITIES, MAJOR_CITIES } from '@/types'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Vett — Know Before You Rent',
  description: 'Lease-verified renter reviews and public records on landlords nationwide. Know before you rent.',
}

async function getStats() {
  try {
    const supabase = await createClient()
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
    const supabase = await createClient()
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
          className={`h-3.5 w-3.5 ${i < Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'}`}
        />
      ))}
    </div>
  )
}

export default async function HomePage() {
  const [stats, recentReviews] = await Promise.all([getStats(), getRecentReviews()])
  const quickSearchCities = MAJOR_CITIES.slice(0, 8)

  return (
    <div className="min-h-screen">

      {/* ── Hero ── */}
      <section className="hero-gradient relative overflow-hidden py-24 sm:py-32 px-4">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-navy-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 mb-8 text-sm text-teal-200">
            <CheckCircle className="h-3.5 w-3.5 text-teal-400 flex-shrink-0" />
            <span>Lease-verified reviews · Daily govt data · Free for renters</span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-none tracking-tight text-balance">
            Know before
            <br />
            <span className="gradient-text">you rent.</span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Landlords screen tenants. Now renters have{' '}
            <strong className="text-white font-semibold">Vett</strong> —
            lease-verified reviews and government violation records on landlords nationwide.
          </p>

          <div className="mt-10 max-w-2xl mx-auto">
            <div className="search-glow rounded-2xl">
              <SearchBar size="lg" />
            </div>
            <p className="mt-3 text-sm text-slate-400">
              Search by landlord name, management company, or address
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              {quickSearchCities.map(({ city, state }) => (
                <Link
                  key={`${city}-${state}`}
                  href={`/search?city=${encodeURIComponent(city)}&state=${state}`}
                  className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-teal-300/40 hover:bg-white/15 hover:text-white"
                >
                  {city}, {state}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Live numbers ── */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-6 grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-100">
          {[
            { icon: Star, label: 'Verified reviews',    value: stats.reviews > 0   ? stats.reviews.toLocaleString()   : '—', color: 'text-amber-500' },
            { icon: Building2, label: 'Landlords tracked', value: stats.landlords > 0 ? stats.landlords.toLocaleString() : '—', color: 'text-navy-600' },
            { icon: AlertTriangle, label: 'Public records',  value: stats.records > 0  ? stats.records.toLocaleString()  : '—', color: 'text-red-500'  },
            { icon: MapPin, label: 'Cities covered',    value: '20+',                                                          color: 'text-teal-600' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="flex flex-col items-center justify-center px-6 py-4 text-center">
              <Icon className={`h-5 w-5 mb-2 ${color}`} />
              <div className="text-2xl font-bold text-gray-900 tabular-nums">{value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs uppercase tracking-widest text-teal-600 font-semibold mb-3">Simple process</p>
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">Research any landlord in minutes</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
            {[
              { step: '01', title: 'Search your landlord', desc: 'Search by name, management company, or property address.' },
              { step: '02', title: 'See the full picture', desc: 'Read verified reviews and government violation records side-by-side.' },
              { step: '03', title: 'Decide with confidence', desc: "Sign knowing exactly what you're getting into — no surprises." },
            ].map(({ step, title, desc }) => (
              <div key={step} className="text-center md:text-left">
                <div className="text-6xl font-black text-gray-100 leading-none mb-4 select-none">{step}</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Vett — 3 pillars ── */}
      <section className="py-20 px-4 bg-slate-50 border-y border-gray-100">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs uppercase tracking-widest text-teal-600 font-semibold mb-3">Why Vett</p>
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">Everything you need to rent with confidence</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              {
                icon: Shield,
                title: 'Lease-Verified Reviews',
                description: 'Every published review is backed by a real lease document. No fake reviews — ever.',
                accent: 'text-teal-600',
                bar: 'bg-teal-500',
              },
              {
                icon: FileText,
                title: 'Public Records Database',
                description: 'Court cases, HPD violations, eviction filings, and code enforcement — pulled daily from 20+ government sources.',
                accent: 'text-indigo-600',
                bar: 'bg-indigo-500',
              },
              {
                icon: Globe,
                title: 'Nationwide Coverage',
                description: 'NYC, Chicago, LA, Houston, Miami, DC, Boston, and more. One platform covers every major rental market.',
                accent: 'text-navy-600',
                bar: 'bg-navy-500',
              },
            ].map(({ icon: Icon, title, description, accent, bar }) => (
              <div key={title}>
                <div className={`h-0.5 w-10 rounded-full ${bar} mb-6`} />
                <Icon className={`h-6 w-6 ${accent} mb-4`} />
                <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 leading-relaxed text-sm">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Recent reviews ── */}
      {recentReviews.length > 0 && (
        <section className="py-20 px-4 bg-white">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-end justify-between mb-10">
              <div>
                <p className="text-xs uppercase tracking-widest text-teal-600 font-semibold mb-2">Community</p>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Recent lease-verified reviews</h2>
              </div>
              <Link href="/search" className="text-sm text-gray-500 hover:text-gray-900 font-medium flex items-center gap-1 transition-colors">
                Browse all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentReviews.map((review: any) => (
                <div key={review.id} className="group flex flex-col gap-3 py-5 border-t border-gray-100 hover:border-teal-200 transition-colors">
                  <div className="flex items-center justify-between">
                    <StarDisplay rating={review.rating_overall} />
                    <span className="text-xs text-gray-400">
                      {new Date(review.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">{review.title}</p>
                  <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed flex-1">{review.body}</p>
                  <div className="flex items-center gap-1.5">
                    <Building2 className="h-3 w-3 text-gray-300 flex-shrink-0" />
                    <p className="text-xs text-gray-400 truncate">
                      {review.landlord?.display_name ?? 'Unknown'}
                      {review.landlord?.city && <span> · {review.landlord.city}</span>}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Dual CTA ── */}
      <section className="py-20 px-4 bg-slate-50 border-y border-gray-100">
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 to-navy-800 rounded-3xl p-8 text-white">
            <div className="absolute top-0 right-0 w-48 h-48 bg-teal-500/10 rounded-full -translate-y-24 translate-x-24 pointer-events-none" />
            <div className="relative">
              <div className="h-10 w-10 bg-amber-400/20 rounded-2xl flex items-center justify-center mb-5">
                <Star className="h-5 w-5 text-amber-400" />
              </div>
              <h2 className="text-xl font-bold mb-2 leading-snug">Had a landlord experience?</h2>
              <p className="text-sm text-slate-300 leading-relaxed mb-6">
                Help the next renter decide. Your review stays anonymous and builds community accountability.
              </p>
              <Button asChild size="sm" className="bg-white text-slate-900 hover:bg-slate-100 font-semibold rounded-full px-5">
                <Link href="/review/new">
                  Write a Review <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="relative overflow-hidden bg-gradient-to-br from-teal-600 to-teal-500 rounded-3xl p-8 text-white">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-24 translate-x-24 pointer-events-none" />
            <div className="relative">
              <div className="h-10 w-10 bg-white/20 rounded-2xl flex items-center justify-center mb-5">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-xl font-bold mb-2 leading-snug">Don&apos;t see your landlord?</h2>
              <p className="text-sm text-teal-100 leading-relaxed mb-6">
                Submit missing landlords so the community can start leaving reviews and holding them accountable.
              </p>
              <Button asChild size="sm" className="bg-white text-teal-700 hover:bg-teal-50 font-semibold rounded-full px-5">
                <Link href="/add-landlord">
                  Add a Landlord <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── City coverage ── */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-xs uppercase tracking-widest text-teal-600 font-semibold mb-2">Coverage</p>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">Find your city</h2>
            </div>
            <p className="text-xs text-gray-400 hidden sm:block flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-teal-500 mr-1" />
              = public records available
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
            {MAJOR_CITIES.map(({ city, state, dataCoverage }) => (
              <Link
                key={`${city}-${state}`}
                href={`/city/${state.toLowerCase()}/${city.toLowerCase().replace(/\s+/g, '-')}`}
                className="group flex items-center justify-between gap-1 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:text-teal-700 hover:bg-teal-50 transition-all duration-150"
              >
                <span className="truncate">{city}, {state}</span>
                <span className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  {dataCoverage && <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />}
                  <ArrowRight className="h-3 w-3 text-teal-400" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── College cities ── */}
      <section className="py-14 px-4 bg-slate-50 border-t border-gray-100">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <p className="text-xs uppercase tracking-widest text-navy-600 font-semibold mb-2">For students</p>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">College cities</h2>
            <p className="text-gray-500 text-sm mt-1">Search landlord reviews near your university</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {COLLEGE_CITIES.slice(0, 8).map(({ city, state }) => (
              <Link
                key={`${city}-${state}`}
                href={`/city/${state.toLowerCase()}/${city.toLowerCase().replace(/\s+/g, '-')}`}
                className="group flex items-center justify-between gap-1 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:text-navy-700 hover:bg-navy-50 transition-all duration-150"
              >
                <span>{city}, {state}</span>
                <ArrowRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-navy-400 transition-colors flex-shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust strip ── */}
      <section className="py-10 px-4 border-t border-gray-100 bg-white">
        <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {[
            { icon: Scale, label: 'Section 230 protected' },
            { icon: CheckCircle, label: 'Not a consumer reporting agency' },
            { icon: Users, label: 'Free for renters, always' },
            { icon: TrendingUp, label: 'Updated daily from govt sources' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 text-sm text-gray-400">
              <Icon className="h-3.5 w-3.5 text-teal-500 flex-shrink-0" />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
