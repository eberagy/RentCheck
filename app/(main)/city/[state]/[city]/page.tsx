import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { MapPin, ArrowRight, Building2, FileText, GraduationCap } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/server'
import { LandlordCard } from '@/components/landlord/LandlordCard'
import { SearchBar } from '@/components/search/SearchBar'
import { Button } from '@/components/ui/button'
import { US_STATES, COLLEGE_CITIES } from '@/types'
import type { Landlord } from '@/types'

export const revalidate = 3600

interface CityPageProps {
  params: { state: string; city: string }
}

function formatCityName(slug: string) {
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

export async function generateMetadata({ params }: CityPageProps): Promise<Metadata> {
  const p = await params
  const cityName = formatCityName(p.city)
  const stateAbbr = p.state.toUpperCase()
  const stateName = US_STATES.find(s => s.abbr === stateAbbr)?.name ?? stateAbbr
  return {
    title: `Landlord Reviews in ${cityName}, ${stateAbbr}`,
    description: `Read lease-verified renter reviews and public records for landlords in ${cityName}, ${stateName}. Research before you rent.`,
    openGraph: {
      title: `Landlord Reviews in ${cityName}, ${stateAbbr} | Vett`,
      description: `Research landlords in ${cityName}. Lease-verified reviews + housing violations + eviction records.`,
    },
  }
}

export default async function CityPage({ params }: CityPageProps) {
  const p = await params
  const cityName = formatCityName(p.city)
  const stateAbbr = p.state.toUpperCase()
  const stateName = US_STATES.find(s => s.abbr === stateAbbr)?.name ?? stateAbbr

  const supabase = createServiceClient()

  // Get top landlords in this city
  const { data: landlords, count } = await supabase
    .from('landlords')
    .select('*', { count: 'exact' })
    .ilike('city', `%${cityName}%`)
    .eq('state_abbr', stateAbbr)
    .order('review_count', { ascending: false })
    .limit(20)

  if (!landlords) notFound()

  // Get property IDs for this city, then count public records
  const { data: cityProps } = await supabase
    .from('properties')
    .select('id')
    .ilike('city', `%${cityName}%`)
    .eq('state_abbr', stateAbbr)
  const cityPropIds = (cityProps ?? []).map((p: { id: string }) => p.id)
  const { count: recordCount } = cityPropIds.length > 0
    ? await supabase
        .from('public_records')
        .select('*', { count: 'exact', head: true })
        .in('property_id', cityPropIds)
    : { count: 0 }

  // Get college info
  const collegeInfo = COLLEGE_CITIES.find(
    c => c.city.toLowerCase() === cityName.toLowerCase() && c.state === stateAbbr
  )

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <nav className="mb-4 flex items-center gap-1 text-xs text-slate-500">
          <Link href="/" className="transition-colors hover:text-navy-700 hover:underline">Home</Link>
          <span className="text-slate-300">›</span>
          <Link href="/search" className="transition-colors hover:text-navy-700 hover:underline">Search</Link>
          <span className="text-slate-300">›</span>
          <span className="font-medium text-slate-700">{cityName}, {stateAbbr}</span>
        </nav>

        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.08),transparent_40%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-5 py-8 sm:px-8">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <MapPin className="h-4 w-4 text-teal-600" />
              <span>{stateName}</span>
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Landlord Reviews in {cityName}, {stateAbbr}
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-600">
                <Building2 className="h-3.5 w-3.5 text-navy-500" />
                {count ?? 0} landlords
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-600">
                <FileText className="h-3.5 w-3.5 text-navy-500" />
                {recordCount ?? 0} public records
              </span>
            </div>
            {collegeInfo && (
              <div className="mt-5 flex flex-wrap gap-2">
                {collegeInfo.universities.map(uni => (
                  <span key={uni} className="inline-flex items-center gap-1.5 rounded-full border border-navy-200 bg-navy-50 px-3 py-1.5 text-xs font-medium text-navy-700">
                    <GraduationCap className="h-3 w-3" />
                    {uni}
                  </span>
                ))}
              </div>
            )}
            <div className="mt-6 max-w-xl">
              <SearchBar size="md" placeholder={`Search landlords in ${cityName}…`} />
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="mt-8">
          {landlords.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white py-16 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                <Building2 className="h-7 w-7 text-slate-400" />
              </div>
              <p className="text-base font-semibold text-slate-700">No landlords listed yet in {cityName}</p>
              <p className="mt-1 text-sm text-slate-400">Be the first to add one and help fellow renters.</p>
              <div className="mt-6 flex justify-center gap-3">
                <Button asChild variant="outline" className="rounded-full">
                  <Link href="/add-landlord">Add a Landlord</Link>
                </Button>
                <Button asChild className="rounded-full bg-navy-600 hover:bg-navy-700">
                  <Link href="/review/new">Write a Review</Link>
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-4 rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Top landlords in {cityName}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Sorted by review count. Click any card for full details, reviews, and public records.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {landlords.map((landlord: Landlord) => (
                  <LandlordCard key={landlord.id} landlord={landlord} />
                ))}
              </div>
            </>
          )}
        </div>

        {/* CTA */}
        <div className="mt-12 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-navy-600 to-teal-600 px-6 py-10 text-center text-white sm:px-10">
            <h2 className="text-2xl font-bold tracking-tight">Know a landlord in {cityName}?</h2>
            <p className="mt-2 text-sm text-white/80">
              Help fellow renters by sharing your lease-verified experience.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button asChild className="rounded-full bg-white text-navy-700 font-semibold hover:bg-slate-100">
                <Link href="/review/new">
                  Write a Review <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full border-white/30 text-white hover:bg-white/10">
                <Link href="/add-landlord">Add Missing Landlord</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
