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
  return {
    title: 'Compare Landlords',
    description: 'Compare two landlord profiles side by side across ratings, violations, and renter feedback.',
    robots: 'noindex',
  }
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
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Link href="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <div className="mb-8 max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-600">Side-by-side analysis</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Landlord comparison</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
          Review ratings, verification status, violations, and renter sentiment in one clean view before you decide who to rent from.
        </p>
      </div>

      {/* Header cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        {[a, b].map((landlord, i) => (
          <div
            key={landlord.id}
            className={`rounded-3xl border bg-white p-5 shadow-sm transition-shadow ${overallWinner === (i === 0 ? 'a' : 'b') ? 'border-teal-300 ring-2 ring-teal-100' : 'border-slate-200'}`}
          >
            {overallWinner === (i === 0 ? 'a' : 'b') && (
              <div className="mb-3 inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700">
                <CheckCircle2 className="h-3 w-3" /> Higher Rated
              </div>
            )}
            <div className="flex items-start justify-between gap-2">
              <div>
                <Link href={`/landlord/${landlord.slug}`} className="text-lg font-bold text-slate-950 transition-colors hover:text-navy-600 hover:underline">
                  {landlord.display_name}
                </Link>
                {landlord.is_verified && <VerifiedBadge />}
                {(landlord.city || landlord.state_abbr) && (
                  <p className="mt-1 text-sm text-slate-500">{[landlord.city, landlord.state_abbr].filter(Boolean).join(', ')}</p>
                )}
              </div>
              <LandlordGrade grade={landlord.grade} size="md" />
            </div>
            <div className="mt-3">
              {landlord.avg_rating > 0 ? (
                <>
                  <div className="text-3xl font-bold text-slate-950">{landlord.avg_rating.toFixed(1)}</div>
                  <StarRating value={landlord.avg_rating} readonly size="sm" />
                  <p className="mt-1 text-xs text-slate-500">{landlord.review_count} reviews</p>
                </>
              ) : (
                <p className="text-sm text-slate-400">No reviews yet</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Comparison table */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        {/* Column headers */}
        <div className="grid grid-cols-3 items-center gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3">
          <div className="text-center text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Category</div>
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
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
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
    <div className="grid grid-cols-3 items-center gap-4 px-5 py-3 transition-colors hover:bg-slate-50">
      <div className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className={`rounded-xl py-1.5 text-center text-sm font-semibold ${isGoodA ? 'bg-teal-50 text-teal-700' : 'text-slate-700'}`}>
        {isGoodA && <span className="mr-1">▲</span>}
        {valA}
      </div>
      <div className={`rounded-xl py-1.5 text-center text-sm font-semibold ${isGoodB ? 'bg-teal-50 text-teal-700' : 'text-slate-700'}`}>
        {isGoodB && <span className="mr-1">▲</span>}
        {valB}
      </div>
    </div>
  )
}

function CompareSearch() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-10">
      <Search className="mx-auto mb-4 h-12 w-12 text-slate-300" />
      <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Compare landlords</h1>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500 sm:text-base">
        Search for two landlords on Vett and we'll compare their ratings, violations, and renter feedback side by side.
      </p>
      <p className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-500">
        To compare, visit a landlord's profile and use the <strong>Compare</strong> button, or go to any landlord page and add{' '}
        <code className="rounded bg-white px-1.5 py-0.5 text-slate-700">?compare=true</code> to the URL.
        <br /><br />
        Or use this URL format:<br />
        <code className="rounded bg-white px-1.5 py-0.5 text-xs text-slate-700">/compare?a=landlord-slug-1&b=landlord-slug-2</code>
      </p>
      <div className="mt-6">
        <Button asChild className="bg-teal-600 hover:bg-teal-700 text-white">
          <Link href="/search">Search Landlords</Link>
        </Button>
      </div>
      </div>
    </div>
  )
}
