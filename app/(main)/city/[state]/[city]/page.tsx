import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LandlordCard } from '@/components/landlord/LandlordCard'
import { US_STATES, COLLEGE_CITIES } from '@/types'
import type { Landlord } from '@/types'

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

  const supabase = await createClient()

  // Get top landlords in this city
  const { data: landlords, count } = await supabase
    .from('landlords')
    .select('*', { count: 'exact' })
    .ilike('city', `%${cityName}%`)
    .eq('state_abbr', stateAbbr)
    .order('review_count', { ascending: false })
    .limit(20)

  if (!landlords) notFound()

  // Get public record counts for this city
  const { count: recordCount } = await supabase
    .from('public_records')
    .select('*', { count: 'exact', head: true })
    .in('property_id',
      supabase.from('properties').select('id').ilike('city', `%${cityName}%`).eq('state_abbr', stateAbbr) as unknown as string[]
    )

  // Get college info
  const collegeInfo = COLLEGE_CITIES.find(
    c => c.city.toLowerCase() === cityName.toLowerCase() && c.state === stateAbbr
  )

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <nav className="text-xs text-gray-500 mb-3">
          <Link href="/" className="hover:underline">Home</Link>
          <span className="mx-1">›</span>
          <Link href="/search" className="hover:underline">Search</Link>
          <span className="mx-1">›</span>
          <span>{cityName}, {stateAbbr}</span>
        </nav>
        <h1 className="text-3xl font-bold text-gray-900">
          Landlord Reviews in {cityName}, {stateAbbr}
        </h1>
        <p className="text-gray-600 mt-2">
          {count ?? 0} landlords · {recordCount ?? 0} public records · {stateName}
        </p>
        {collegeInfo && (
          <div className="mt-3 flex flex-wrap gap-2">
            {collegeInfo.universities.map(uni => (
              <span key={uni} className="text-xs bg-navy-50 text-navy-700 border border-navy-100 rounded-full px-3 py-1">
                {uni}
              </span>
            ))}
          </div>
        )}
      </div>

      {landlords.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <p className="font-medium text-gray-700">No landlords listed yet in {cityName}</p>
          <p className="text-sm text-gray-500 mt-1">Be the first to add one</p>
          <Link href="/review/new" className="mt-4 inline-flex items-center text-sm text-navy-600 hover:underline font-medium">
            Write a Review →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {landlords.map((landlord: Landlord) => (
            <LandlordCard key={landlord.id} landlord={landlord} />
          ))}
        </div>
      )}

      {/* CTA */}
      <div className="mt-10 bg-navy-50 border border-navy-100 rounded-xl p-6 text-center">
        <h2 className="font-semibold text-navy-900">Know a landlord in {cityName}?</h2>
        <p className="text-sm text-navy-700 mt-1">Help fellow renters by sharing your experience.</p>
        <Link
          href="/review/new"
          className="mt-3 inline-flex items-center bg-navy-500 hover:bg-navy-600 text-white text-sm font-semibold rounded-lg px-5 py-2.5 transition-colors"
        >
          Write a Review
        </Link>
      </div>
    </div>
  )
}
