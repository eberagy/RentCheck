import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Star, MapPin, BadgeCheck } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'

interface RenterProfilePageProps {
  params: { id: string }
}

export const revalidate = 3600

export async function generateMetadata({ params }: RenterProfilePageProps): Promise<Metadata> {
  const p = await params
  const service = createServiceClient()
  const { data: profile } = await service
    .from('profiles')
    .select('full_name, public_profile, is_banned')
    .eq('id', p.id)
    .single()

  if (!profile?.public_profile || profile.is_banned) {
    return { title: 'Profile not available', robots: { index: false, follow: false } }
  }

  const name = profile.full_name?.trim() || 'Vett reviewer'
  return {
    title: `${name} — Reviews on Vett`,
    description: `Lease-verified landlord reviews by ${name} on Vett.`,
    alternates: { canonical: `/u/${p.id}` },
  }
}

export default async function RenterProfilePage({ params }: RenterProfilePageProps) {
  const p = await params
  const service = createServiceClient()

  const { data: profile } = await service
    .from('profiles')
    .select('id, full_name, avatar_url, bio, public_profile, is_banned, created_at')
    .eq('id', p.id)
    .single()

  if (!profile || !profile.public_profile || profile.is_banned) {
    notFound()
  }

  // Public profile shows only reviews the user explicitly chose to display
  // their name on. is_anonymous=true reviews stay invisible here even though
  // the user opted into a public profile — they made two separate decisions.
  const { data: reviews } = await service
    .from('reviews')
    .select('id, title, body, rating_overall, lease_verified, created_at, landlord:landlords(display_name, slug, city, state_abbr)')
    .eq('reviewer_id', p.id)
    .eq('status', 'approved')
    .eq('is_anonymous', false)
    .order('created_at', { ascending: false })
    .limit(50)

  const approvedReviews = reviews ?? []
  const firstName = profile.full_name?.split(' ')[0]?.trim() || 'Reviewer'
  const joinYear = new Date(profile.created_at).getFullYear()
  const verifiedCount = approvedReviews.filter(r => r.lease_verified).length

  return (
    <div className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-white px-7 py-12">
        <div className="mx-auto max-w-[820px] flex items-center gap-5">
          <div
            className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-navy-600 text-3xl font-bold text-white"
            aria-hidden="true"
          >
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt="" className="h-20 w-20 rounded-2xl object-cover" />
            ) : (
              <span>{firstName.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-[clamp(1.5rem,3vw,2rem)] leading-tight tracking-tight text-slate-900">
              {profile.full_name?.trim() || 'Anonymous reviewer'}
            </h1>
            <p className="mt-1 text-[13.5px] text-slate-500">
              {approvedReviews.length} published review{approvedReviews.length === 1 ? '' : 's'}
              {' · '}
              {verifiedCount} lease-verified
              {' · '}
              Joined {joinYear}
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[820px] px-7 py-10">
        {approvedReviews.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm text-slate-500">
            No published reviews yet.
          </div>
        ) : (
          <div className="grid gap-4">
            {approvedReviews.map(r => {
              const landlord = r.landlord as unknown as {
                display_name: string
                slug: string
                city: string | null
                state_abbr: string | null
              } | null
              return (
                <article key={r.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center gap-2 text-[12px] text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating_overall ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                      ))}
                    </span>
                    <time dateTime={r.created_at}>{formatDate(r.created_at)}</time>
                    {r.lease_verified && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 font-semibold text-teal-700">
                        <BadgeCheck className="h-3 w-3" /> Lease verified
                      </span>
                    )}
                  </div>
                  <h2 className="mt-2 text-[16.5px] font-bold text-slate-900">{r.title}</h2>
                  <p className="mt-1 text-[14px] leading-relaxed text-slate-700 whitespace-pre-wrap line-clamp-5">{r.body}</p>
                  {landlord && (
                    <Link
                      href={`/landlord/${landlord.slug}`}
                      className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-navy-700 hover:underline"
                    >
                      <MapPin className="h-3.5 w-3.5" />
                      {landlord.display_name}
                      {landlord.city && (
                        <span className="text-slate-400"> · {landlord.city}{landlord.state_abbr ? `, ${landlord.state_abbr}` : ''}</span>
                      )}
                    </Link>
                  )}
                </article>
              )
            })}
          </div>
        )}

        <p className="mt-10 text-center text-[12px] text-slate-400">
          Public profile shared by {firstName}. You can <Link href="/dashboard/settings#public-profile" className="underline hover:text-slate-600">turn yours on or off</Link> in settings.
        </p>
      </section>
    </div>
  )
}
