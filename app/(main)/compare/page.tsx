import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowLeft, CheckCircle2, XCircle, Minus, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { LandlordGrade } from '@/components/landlord/LandlordGrade'
import { VerifiedBadge } from '@/components/landlord/VerifiedBadge'
import { StarRating } from '@/components/review/StarRating'
import { Button } from '@/components/ui/button'
import { RatingBar } from '@/components/landlord/RatingBar'

interface ComparePageProps {
  searchParams: Promise<{ a?: string; b?: string }>
}

export async function generateMetadata({ searchParams }: ComparePageProps): Promise<Metadata> {
  return { title: 'Compare Landlords', robots: 'noindex' }
}

export default async function ComparePage({ searchParams }: ComparePageProps) {
  const params = await searchParams
  const slugA = params.a
  const slugB = params.b

  if (!slugA || !slugB) {
    return <CompareSearch />
  }

  const supabase = await createClient()

  const [{ data: landlordA }, { data: landlordB }] = await Promise.all([
    supabase.from('landlords').select('*').eq('slug', slugA).single(),
    supabase.from('landlords').select('*').eq('slug', slugB).single(),
  ])

  if (!landlordA || !landlordB) notFound()

  // Fetch sub-ratings for both
  const [{ data: ratingsA }, { data: ratingsB }] = await Promise.all([
    supabase.from('reviews').select('rating_responsiveness, rating_maintenance, rating_honesty, rating_lease_fairness, would_rent_again').eq('landlord_id', landlordA.id).eq('status', 'approved'),
    supabase.from('reviews').select('rating_responsiveness, rating_maintenance, rating_honesty, rating_lease_fairness, would_rent_again').eq('landlord_id', landlordB.id).eq('status', 'approved'),
  ])

  function avgRating(data: any[], key: string) {
    const vals = (data ?? []).map((r: any) => r[key]).filter((v: any): v is number => typeof v === 'number')
    return vals.length ? vals.reduce((a: number, b: number) => a + b, 0) / vals.length : null
  }

  function wouldRentPct(data: any[]) {
    if (!data?.length) return null
    return Math.round((data.filter((r: any) => r.would_rent_again === true).length / data.length) * 100)
  }

  const a = {
    ...landlordA,
    avgResponsiveness: avgRating(ratingsA ?? [], 'rating_responsiveness'),
    avgMaintenance: avgRating(ratingsA ?? [], 'rating_maintenance'),
    avgHonesty: avgRating(ratingsA ?? [], 'rating_honesty'),
    avgLeaseFairness: avgRating(ratingsA ?? [], 'rating_lease_fairness'),
    wouldRentPct: wouldRentPct(ratingsA ?? []),
  }

  const b = {
    ...landlordB,
    avgResponsiveness: avgRating(ratingsB ?? [], 'rating_responsiveness'),
    avgMaintenance: avgRating(ratingsB ?? [], 'rating_maintenance'),
    avgHonesty: avgRating(ratingsB ?? [], 'rating_honesty'),
    avgLeaseFairness: avgRating(ratingsB ?? [], 'rating_lease_fairness'),
    wouldRentPct: wouldRentPct(ratingsB ?? []),
  }

  function winner(valA: number | null, valB: number | null, higherIsBetter = true) {
    if (valA === null && valB === null) return 'tie'
    if (valA === null) return 'b'
    if (valB === null) return 'a'
    if (valA === valB) return 'tie'
    return higherIsBetter ? (valA > valB ? 'a' : 'b') : (valA < valB ? 'a' : 'b')
  }

  const overallWinner = winner(a.avg_rating, b.avg_rating)

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <h1 className="font-display text-[clamp(2rem,4vw,3rem)] leading-[1.08] tracking-tight text-slate-900 mb-2">Landlord Comparison</h1>
      <p className="text-[15px] text-slate-500 mb-8">Side-by-side comparison of public records and renter ratings</p>

      {/* Header cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {[a, b].map((landlord, i) => (
          <div
            key={landlord.id}
            className={`bg-white rounded-xl border p-5 ${overallWinner === (i === 0 ? 'a' : 'b') ? 'border-teal-400 ring-2 ring-teal-100' : 'border-gray-200'}`}
          >
            {overallWinner === (i === 0 ? 'a' : 'b') && (
              <div className="inline-flex items-center gap-1 text-xs text-teal-700 font-semibold bg-teal-50 rounded-full px-2.5 py-1 mb-2">
                <CheckCircle2 className="h-3 w-3" /> Higher Rated
              </div>
            )}
            <div className="flex items-start justify-between gap-2">
              <div>
                <Link href={`/landlord/${landlord.slug}`} className="font-bold text-gray-900 hover:text-navy-600 hover:underline text-lg">
                  {landlord.display_name}
                </Link>
                {landlord.is_verified && <VerifiedBadge />}
                {(landlord.city || landlord.state_abbr) && (
                  <p className="text-sm text-gray-500 mt-0.5">{[landlord.city, landlord.state_abbr].filter(Boolean).join(', ')}</p>
                )}
              </div>
              <LandlordGrade grade={landlord.grade} size="md" />
            </div>
            <div className="mt-3">
              {landlord.avg_rating > 0 ? (
                <>
                  <div className="text-3xl font-bold text-gray-900">{landlord.avg_rating.toFixed(1)}</div>
                  <StarRating value={landlord.avg_rating} readonly size="sm" />
                  <p className="text-xs text-gray-500 mt-0.5">{landlord.review_count} reviews</p>
                </>
              ) : (
                <p className="text-sm text-gray-400">No reviews yet</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Comparison table */}
      <div className="bg-white rounded-xl border border-gray-200 divide-y overflow-hidden">
        {/* Column headers */}
        <div className="grid grid-cols-3 items-center py-2.5 px-5 gap-4 bg-gray-50 border-b border-gray-200">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide text-center">Category</div>
          <div className="text-xs font-semibold text-navy-700 text-center truncate">{a.display_name}</div>
          <div className="text-xs font-semibold text-navy-700 text-center truncate">{b.display_name}</div>
        </div>
        <CompareRow
          label="Overall Rating"
          valA={a.avg_rating > 0 ? a.avg_rating.toFixed(1) + ' / 5' : '—'}
          valB={b.avg_rating > 0 ? b.avg_rating.toFixed(1) + ' / 5' : '—'}
          winner={winner(a.avg_rating || null, b.avg_rating || null)}
        />
        <CompareRow
          label="Total Reviews"
          valA={String(a.review_count)}
          valB={String(b.review_count)}
          winner="tie"
          note
        />
        <CompareRow
          label="Responsiveness"
          valA={a.avgResponsiveness ? a.avgResponsiveness.toFixed(1) : '—'}
          valB={b.avgResponsiveness ? b.avgResponsiveness.toFixed(1) : '—'}
          winner={winner(a.avgResponsiveness, b.avgResponsiveness)}
        />
        <CompareRow
          label="Maintenance"
          valA={a.avgMaintenance ? a.avgMaintenance.toFixed(1) : '—'}
          valB={b.avgMaintenance ? b.avgMaintenance.toFixed(1) : '—'}
          winner={winner(a.avgMaintenance, b.avgMaintenance)}
        />
        <CompareRow
          label="Honesty"
          valA={a.avgHonesty ? a.avgHonesty.toFixed(1) : '—'}
          valB={b.avgHonesty ? b.avgHonesty.toFixed(1) : '—'}
          winner={winner(a.avgHonesty, b.avgHonesty)}
        />
        <CompareRow
          label="Lease Fairness"
          valA={a.avgLeaseFairness ? a.avgLeaseFairness.toFixed(1) : '—'}
          valB={b.avgLeaseFairness ? b.avgLeaseFairness.toFixed(1) : '—'}
          winner={winner(a.avgLeaseFairness, b.avgLeaseFairness)}
        />
        <CompareRow
          label="Would Rent Again"
          valA={a.wouldRentPct !== null ? `${a.wouldRentPct}%` : '—'}
          valB={b.wouldRentPct !== null ? `${b.wouldRentPct}%` : '—'}
          winner={winner(a.wouldRentPct, b.wouldRentPct)}
        />
        <CompareRow
          label="Open Violations"
          valA={String(a.open_violation_count ?? 0)}
          valB={String(b.open_violation_count ?? 0)}
          winner={winner(a.open_violation_count ?? 0, b.open_violation_count ?? 0, false)}
          lowerIsBetter
        />
        <CompareRow
          label="Total Violations"
          valA={String(a.total_violation_count ?? 0)}
          valB={String(b.total_violation_count ?? 0)}
          winner={winner(a.total_violation_count ?? 0, b.total_violation_count ?? 0, false)}
          lowerIsBetter
        />
        <CompareRow
          label="Eviction Filings"
          valA={String(a.eviction_count ?? 0)}
          valB={String(b.eviction_count ?? 0)}
          winner={winner(a.eviction_count ?? 0, b.eviction_count ?? 0, false)}
          lowerIsBetter
        />
        <CompareRow
          label="Profile Verified"
          valA={a.is_verified ? '✓ Verified' : 'Unverified'}
          valB={b.is_verified ? '✓ Verified' : 'Unverified'}
          winner="tie"
        />
      </div>

      {/* View profile links */}
      <div className="grid grid-cols-2 gap-4 mt-6">
        <Button asChild variant="outline" className="w-full">
          <Link href={`/landlord/${a.slug}`}>View {a.display_name}</Link>
        </Button>
        <Button asChild variant="outline" className="w-full">
          <Link href={`/landlord/${b.slug}`}>View {b.display_name}</Link>
        </Button>
      </div>
    </div>
  )
}

function CompareRow({
  label,
  valA,
  valB,
  winner,
  lowerIsBetter = false,
  note = false,
}: {
  label: string
  valA: string
  valB: string
  winner: 'a' | 'b' | 'tie'
  lowerIsBetter?: boolean
  note?: boolean
}) {
  const isGoodA = winner === 'a' && !note
  const isGoodB = winner === 'b' && !note
  return (
    <div className="grid grid-cols-3 items-center py-3 px-5 gap-4 hover:bg-gray-50 transition-colors">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">{label}</div>
      <div className={`text-center text-sm font-semibold rounded-md py-1 ${isGoodA ? 'text-teal-700 bg-teal-50' : 'text-gray-700'}`}>
        {isGoodA && <span className="mr-1">▲</span>}
        {valA}
      </div>
      <div className={`text-center text-sm font-semibold rounded-md py-1 ${isGoodB ? 'text-teal-700 bg-teal-50' : 'text-gray-700'}`}>
        {isGoodB && <span className="mr-1">▲</span>}
        {valB}
      </div>
    </div>
  )
}

function CompareSearch() {
  return (
    <div className="max-w-xl mx-auto px-4 py-20 text-center">
      <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-navy-50 ring-1 ring-navy-100">
        <Search className="h-7 w-7 text-navy-600" aria-hidden="true" />
      </div>
      <h1 className="font-display text-[clamp(2rem,4vw,3rem)] leading-[1.08] tracking-tight text-slate-900 mb-3">Compare Landlords</h1>
      <p className="text-[15px] text-slate-500 mb-8 leading-relaxed">
        Put two landlords side by side — ratings, violations, renter feedback, all in one view.
      </p>
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-left text-sm text-slate-600 leading-relaxed">
        <p className="font-semibold text-slate-900 mb-2">How to start a comparison</p>
        <ol className="list-decimal list-inside space-y-1.5">
          <li>Search for a landlord below.</li>
          <li>On their profile, tap the <strong>Compare</strong> button.</li>
          <li>Pick a second landlord to put them head-to-head.</li>
        </ol>
      </div>
      <div className="mt-8">
        <Button asChild className="bg-teal-600 hover:bg-teal-700 text-white">
          <Link href="/search">Search Landlords</Link>
        </Button>
      </div>
    </div>
  )
}
