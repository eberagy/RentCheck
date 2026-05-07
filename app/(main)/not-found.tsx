import Link from 'next/link'
import { Search, Home, MapPin, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Top-of-funnel cities to surface from a 404. Same ordering as the
// homepage hero pills — gives a 404 user an obvious next destination
// instead of just bouncing.
const POPULAR_CITIES = [
  { city: 'New York', state: 'NY', slug: 'new-york' },
  { city: 'Chicago', state: 'IL', slug: 'chicago' },
  { city: 'Philadelphia', state: 'PA', slug: 'philadelphia' },
  { city: 'Boston', state: 'MA', slug: 'boston' },
  { city: 'San Francisco', state: 'CA', slug: 'san-francisco' },
  { city: 'Pittsburgh', state: 'PA', slug: 'pittsburgh' },
]

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-20">
      <div className="text-center max-w-2xl">
        <div className="font-display text-[clamp(5rem,12vw,8rem)] leading-none tracking-tight bg-gradient-to-br from-slate-200 to-slate-100 bg-clip-text text-transparent mb-4">
          404
        </div>
        <h1 className="font-display text-[clamp(1.75rem,3.5vw,2.25rem)] leading-[1.08] tracking-tight text-slate-900 mb-3">Page not found</h1>
        <p className="text-slate-500 mb-8 text-[15px] leading-relaxed">
          The landlord, property, or page you&apos;re looking for doesn&apos;t exist — or may have been removed.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Button asChild className="bg-teal-600 hover:bg-teal-700 text-white">
            <Link href="/search">
              <Search className="h-4 w-4 mr-2" aria-hidden="true" /> Search Landlords
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">
              <Home className="h-4 w-4 mr-2" aria-hidden="true" /> Home
            </Link>
          </Button>
        </div>

        {/* Popular cities — quick recovery path for users who landed on a
            broken city link from a third-party site or stale bookmark. */}
        <div className="mt-12 pt-8 border-t border-slate-100">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-4">Or browse a popular city</p>
          <div className="flex flex-wrap justify-center gap-2">
            {POPULAR_CITIES.map(({ city, state, slug }) => (
              <Link
                key={slug}
                href={`/city/${state.toLowerCase()}/${slug}`}
                className="group inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[12.5px] text-slate-600 transition-colors hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
              >
                <MapPin className="h-3 w-3 text-slate-400 group-hover:text-teal-600" aria-hidden="true" />
                <span>{city}, {state}</span>
                <ArrowRight className="h-3 w-3 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-teal-600" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
