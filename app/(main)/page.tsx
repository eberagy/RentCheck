import Link from 'next/link'
import { Shield, FileText, Globe, ArrowRight, Star, AlertTriangle, Search, TrendingUp, CheckCircle, Building2, Users, MapPin } from 'lucide-react'
import { SearchBar } from '@/components/search/SearchBar'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'
import { COLLEGE_CITIES } from '@/types'
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

const FEATURES = [
  {
    icon: Shield,
    title: 'Lease-Verified Reviews',
    description: 'Every published review is backed by a real lease document and founder review. No fake reviews — just real tenant experiences you can trust.',
    color: 'text-teal-600',
    bg: 'bg-teal-50',
    border: 'border-teal-100',
  },
  {
    icon: FileText,
    title: 'Public Records Database',
    description: 'Court cases, HPD violations, eviction filings, and code enforcement — pulled daily from government databases.',
    color: 'text-navy-600',
    bg: 'bg-navy-50',
    border: 'border-navy-100',
  },
  {
    icon: Globe,
    title: 'Nationwide Coverage',
    description: 'NYC, Chicago, Philadelphia, Boston, Seattle, LA, Austin, and more. One search covers it all.',
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    border: 'border-indigo-100',
  },
]

const HOW_IT_WORKS = [
  { step: '01', title: 'Search your landlord', desc: 'Search by name, management company, or property address.' },
  { step: '02', title: 'See the full picture', desc: 'Read lease-verified reviews and government violation records side-by-side.' },
  { step: '03', title: 'Make a confident decision', desc: 'Sign knowing exactly what you\'re getting into.' },
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
    <div className="min-h-screen">

      {/* ── Hero ── */}
      <section className="hero-gradient relative overflow-hidden py-24 px-4">
        {/* Decorative orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-navy-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center">
          {/* Trust badge */}
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 mb-8 text-sm text-teal-200">
            <CheckCircle className="h-3.5 w-3.5 text-teal-400" />
            <span>Lease-verified reviews • Public records • Founder review</span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-none tracking-tight text-balance">
            Know before
            <br />
            <span className="gradient-text">you rent.</span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Landlords screen tenants with credit checks and background reports.
            Now renters have <strong className="text-white font-semibold">Vett</strong> — lease-verified reviews and government violation records in one place.
          </p>

          {/* Search */}
          <div className="mt-10 max-w-2xl mx-auto">
            <div className="search-glow rounded-2xl">
              <SearchBar size="lg" autoFocus />
            </div>
            <p className="mt-3 text-sm text-slate-400">
              Search by landlord name, management company, address, or city
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              {priorityCities.map((city) => (
                <Link
                  key={`${city.city}-${city.state}`}
                  href={`/search?city=${encodeURIComponent(city.city)}&state=${city.state}`}
                  className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-teal-300/40 hover:bg-white/15 hover:text-white"
                >
                  {city.city}, {city.state}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats Bar ── */}
      {(stats.reviews > 0 || stats.landlords > 0) && (
        <section className="bg-white border-b border-gray-100">
          <div className="max-w-5xl mx-auto px-4 py-5 flex items-center justify-center gap-10 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 bg-teal-50 rounded-xl flex items-center justify-center">
                <Star className="h-4.5 w-4.5 text-teal-600" />
              </div>
              <div>
                <div className="text-xl font-bold text-gray-900">{stats.reviews.toLocaleString()}</div>
                <div className="text-xs text-gray-500">Lease-verified reviews</div>
              </div>
            </div>
            <div className="h-8 w-px bg-gray-100 hidden sm:block" />
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 bg-navy-50 rounded-xl flex items-center justify-center">
                <Building2 className="h-4.5 w-4.5 text-navy-600" />
              </div>
              <div>
                <div className="text-xl font-bold text-gray-900">{stats.landlords.toLocaleString()}</div>
                <div className="text-xs text-gray-500">Landlords tracked</div>
              </div>
            </div>
            <div className="h-8 w-px bg-gray-100 hidden sm:block" />
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 bg-red-50 rounded-xl flex items-center justify-center">
                <AlertTriangle className="h-4.5 w-4.5 text-red-500" />
              </div>
              <div>
                <div className="text-xl font-bold text-gray-900">{stats.records.toLocaleString()}</div>
                <div className="text-xs text-gray-500">Public records</div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── How it works ── */}
      <section className="py-16 px-4 bg-gray-50 border-b border-gray-100">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs uppercase tracking-widest text-teal-600 font-semibold mb-2">Simple process</p>
            <h2 className="text-2xl font-bold text-gray-900">Research any landlord in minutes</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {HOW_IT_WORKS.map(({ step, title, desc }) => (
              <div key={step} className="relative bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="text-4xl font-black text-gray-100 mb-3 leading-none">{step}</div>
                <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs uppercase tracking-widest text-teal-600 font-semibold mb-2">Why Vett</p>
            <h2 className="text-2xl font-bold text-gray-900">Everything you need to make a confident decision</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FEATURES.map(({ icon: Icon, title, description, color, bg, border }) => (
              <div key={title} className={`rounded-2xl border ${border} ${bg} p-6 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5`}>
                <div className={`inline-flex items-center justify-center h-11 w-11 rounded-xl bg-white shadow-sm mb-4`}>
                  <Icon className={`h-5.5 w-5.5 ${color}`} />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2 text-base">{title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Recent reviews ── */}
      {recentReviews.length > 0 && (
        <section className="py-14 px-4 bg-gray-50 border-t border-gray-100">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <p className="text-xs uppercase tracking-widest text-teal-600 font-semibold mb-1">Community</p>
                <h2 className="text-xl font-bold text-gray-900">Recent lease-verified reviews</h2>
              </div>
              <Link href="/search" className="text-sm text-navy-600 hover:text-navy-700 font-medium flex items-center gap-1">
                Browse all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentReviews.slice(0, 6).map((review: any) => (
                <div key={review.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
                  <div className="flex items-center justify-between mb-3">
                    <StarDisplay rating={review.rating_overall} />
                    <span className="text-xs text-gray-400">
                      {new Date(review.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug mb-2">{review.title}</p>
                  <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed mb-3">{review.body}</p>
                  <div className="flex items-center gap-1.5 pt-2 border-t border-gray-100">
                    <Building2 className="h-3 w-3 text-gray-400" />
                    <p className="text-xs text-gray-500 truncate">
                      {review.landlord?.display_name ?? 'Unknown'}
                      {review.landlord?.city && <span className="text-gray-400"> · {review.landlord.city}</span>}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Dual CTA ── */}
      <section className="py-16 px-4 bg-white border-t border-gray-100">
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Renter CTA */}
          <div className="relative overflow-hidden bg-gradient-to-br from-navy-900 to-navy-700 rounded-2xl p-8 text-white">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-20 translate-x-20" />
            <div className="relative">
              <div className="h-10 w-10 bg-amber-400/20 rounded-xl flex items-center justify-center mb-4">
                <Star className="h-5 w-5 text-amber-400" />
              </div>
              <h2 className="text-xl font-bold mb-2">Had a landlord experience?</h2>
              <p className="text-sm text-navy-200 leading-relaxed mb-6">
                Help the next renter decide. Your review is verified, stays anonymous, and helps build community trust.
              </p>
              <Button asChild size="sm" className="bg-white text-navy-900 hover:bg-navy-50 font-semibold">
                <Link href="/review/new">
                  Write a Review <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Add landlord CTA */}
          <div className="relative overflow-hidden bg-gradient-to-br from-teal-700 to-teal-500 rounded-2xl p-8 text-white">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-20 translate-x-20" />
            <div className="relative">
              <div className="h-10 w-10 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-xl font-bold mb-2">Don&apos;t see your landlord?</h2>
              <p className="text-sm text-teal-100 leading-relaxed mb-6">
                Submit missing landlords so the community can start leaving reviews and holding them accountable.
              </p>
              <Button asChild size="sm" className="bg-white text-teal-700 hover:bg-teal-50 font-semibold">
                <Link href="/add-landlord">
                  Add a Landlord <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── College cities ── */}
      <section className="py-14 px-4 bg-gray-50 border-t border-gray-100">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="h-4 w-4 text-teal-600" />
            <h2 className="text-xl font-semibold text-gray-900">Top College Cities</h2>
          </div>
          <p className="text-sm text-gray-500 mb-6">Search landlord reviews near your university</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {COLLEGE_CITIES.slice(0, 8).map(({ city, state }) => (
              <Link
                key={`${city}-${state}`}
                href={`/city/${state.toLowerCase()}/${city.toLowerCase().replace(/\s+/g, '-')}`}
                className="group bg-white rounded-xl border border-gray-200 px-4 py-3.5 text-sm font-medium text-gray-700 hover:border-teal-300 hover:text-teal-700 hover:bg-teal-50 hover:shadow-sm transition-all duration-150"
              >
                <span className="flex items-center justify-between">
                  <span>{city}, {state}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-gray-400 group-hover:text-teal-500 transition-colors" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom trust strip ── */}
      <section className="py-10 px-4 bg-white border-t border-gray-100">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-teal-600" />
            <span>Section 230 protected</span>
          </div>
          <div className="h-4 w-px bg-gray-200 hidden sm:block" />
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-teal-600" />
            <span>Not a consumer reporting agency</span>
          </div>
          <div className="h-4 w-px bg-gray-200 hidden sm:block" />
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-teal-600" />
            <span>Free for renters, always</span>
          </div>
        </div>
      </section>
    </div>
  )
}
