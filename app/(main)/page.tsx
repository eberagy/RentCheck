import Link from 'next/link'
import { Shield, FileText, Globe, ArrowRight, Star, AlertTriangle } from 'lucide-react'
import { SearchBar } from '@/components/search/SearchBar'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'
import { COLLEGE_CITIES } from '@/types'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'RentCheck — Research Your Landlord Before You Sign',
  description: 'Verified renter reviews and public records on landlords nationwide. Know before you rent.',
}

async function getStats() {
  try {
    const supabase = await createClient()
    const [{ count: reviewCount }, { count: landlordCount }, { count: cityCount }] = await Promise.all([
      supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
      supabase.from('landlords').select('*', { count: 'exact', head: true }),
      supabase.from('landlords').select('city', { count: 'exact', head: true }).not('city', 'is', null),
    ])
    return { reviews: reviewCount ?? 0, landlords: landlordCount ?? 0, cities: cityCount ?? 0 }
  } catch {
    return { reviews: 0, landlords: 0, cities: 0 }
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
      .limit(8)
    return data ?? []
  } catch {
    return []
  }
}

const FEATURES = [
  {
    icon: Shield,
    title: 'Verified Reviews',
    description: 'Every review is verified against a real lease document. No fake reviews, no anonymous posts without accountability.',
    color: 'text-teal-600',
    bg: 'bg-teal-50',
  },
  {
    icon: FileText,
    title: 'Public Records',
    description: 'Court cases, housing violations, eviction filings, and code enforcement — automatically pulled from government databases.',
    color: 'text-navy-600',
    bg: 'bg-navy-50',
  },
  {
    icon: Globe,
    title: 'Nationwide Coverage',
    description: 'Starting with major college cities: Baltimore, Pittsburgh, State College, Philadelphia, NYC, Chicago, Boston, and more.',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
]

export default async function HomePage() {
  const [stats, recentReviews] = await Promise.all([getStats(), getRecentReviews()])

  return (
    <div>
      {/* Hero */}
      <section className="hero-gradient py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight text-balance">
            Research your landlord<br />
            <span className="text-teal-300">before you sign.</span>
          </h1>
          <p className="mt-4 text-lg sm:text-xl text-navy-100 max-w-2xl mx-auto leading-relaxed">
            Verified renter reviews + public records, nationwide. Landlords have screened tenants for decades.
            Now it&apos;s your turn.
          </p>
          <div className="mt-8 max-w-2xl mx-auto">
            <SearchBar size="lg" autoFocus />
          </div>
          <p className="mt-3 text-sm text-navy-300">
            Search by landlord name, management company, address, or city
          </p>
        </div>
      </section>

      {/* Stats bar */}
      {(stats.reviews > 0 || stats.landlords > 0) && (
        <section className="bg-navy-800 py-4">
          <div className="max-w-4xl mx-auto px-4 flex items-center justify-center gap-8 flex-wrap">
            <div className="text-center">
              <span className="text-2xl font-bold text-white">{stats.reviews.toLocaleString()}</span>
              <span className="text-navy-300 text-sm ml-2">verified reviews</span>
            </div>
            <div className="w-px h-8 bg-navy-600 hidden sm:block" />
            <div className="text-center">
              <span className="text-2xl font-bold text-white">{stats.landlords.toLocaleString()}</span>
              <span className="text-navy-300 text-sm ml-2">landlords</span>
            </div>
            <div className="w-px h-8 bg-navy-600 hidden sm:block" />
            <div className="text-center">
              <span className="text-2xl font-bold text-white">{stats.cities.toLocaleString()}</span>
              <span className="text-navy-300 text-sm ml-2">cities covered</span>
            </div>
          </div>
        </section>
      )}

      {/* Features */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-10">
            Everything you need to make a confident decision
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FEATURES.map(({ icon: Icon, title, description, color, bg }) => (
              <div key={title} className="text-center p-6 rounded-xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow">
                <div className={`inline-flex items-center justify-center h-12 w-12 rounded-xl ${bg} mb-4`}>
                  <Icon className={`h-6 w-6 ${color}`} />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent reviews ticker */}
      {recentReviews.length > 0 && (
        <section className="py-12 px-4 bg-gray-50">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Recent Reviews</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {recentReviews.slice(0, 4).map((review: any) => (
                <div key={review.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                  <div className="flex items-center gap-1 mb-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3.5 w-3.5 ${i < review.rating_overall ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'}`}
                      />
                    ))}
                  </div>
                  <p className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug">{review.title}</p>
                  <p className="text-xs text-gray-500 mt-2 truncate">
                    {review.landlord?.display_name ?? 'Unknown Landlord'}
                    {review.landlord?.city && ` · ${review.landlord.city}`}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Dual CTA */}
      <section className="py-14 px-4 bg-white border-t border-gray-100">
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-navy-900 rounded-2xl p-8 text-center text-white">
            <AlertTriangle className="h-8 w-8 text-amber-400 mx-auto mb-3" />
            <h2 className="text-xl font-bold mb-2">Had a landlord experience?</h2>
            <p className="text-sm text-navy-200 leading-relaxed mb-5">
              Help the next renter decide. Your review is verified and stays anonymous.
            </p>
            <Button asChild size="sm" className="bg-white text-navy-900 hover:bg-navy-50 font-semibold">
              <Link href="/review/new">
                Write a Review <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="bg-teal-600 rounded-2xl p-8 text-center text-white">
            <Globe className="h-8 w-8 text-teal-200 mx-auto mb-3" />
            <h2 className="text-xl font-bold mb-2">Don&apos;t see your landlord?</h2>
            <p className="text-sm text-teal-100 leading-relaxed mb-5">
              Submit missing landlords so the community can start leaving reviews.
            </p>
            <Button asChild size="sm" className="bg-white text-teal-700 hover:bg-teal-50 font-semibold">
              <Link href="/add-landlord">
                Add a Landlord <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* College cities */}
      <section className="py-12 px-4 bg-gray-50 border-t border-gray-100">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Top College Cities</h2>
          <p className="text-sm text-gray-500 mb-6">Search landlord reviews near your university</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {COLLEGE_CITIES.slice(0, 8).map(({ city, state }) => (
              <Link
                key={`${city}-${state}`}
                href={`/city/${state.toLowerCase()}/${city.toLowerCase().replace(/\s+/g, '-')}`}
                className="bg-white rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 hover:border-navy-300 hover:text-navy-700 hover:bg-navy-50 transition-colors"
              >
                {city}, {state}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
