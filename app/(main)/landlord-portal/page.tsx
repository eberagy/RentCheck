'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Shield, CheckCircle2, Clock, MessageSquare, Flag, ArrowRight,
  Star, TrendingUp, MessageCircle, BarChart2, ChevronDown, ChevronUp, Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { formatDate, formatReviewerName, gradeColor, gradeBgLight, ratingToColor } from '@/lib/utils'
import { toast } from 'sonner'
import type { Landlord, Review, LandlordClaim, LandlordGrade } from '@/types'

const MAX_RESPONSE_LENGTH = 1000

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`}
        />
      ))}
    </div>
  )
}

function RatingBar({ label, value }: { label: string; value: number | null }) {
  if (!value) return null
  const pct = (value / 5) * 100
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 w-28 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-teal-500 rounded-full"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-medium text-gray-700 w-6 text-right">{value.toFixed(1)}</span>
    </div>
  )
}

export default function LandlordPortalPage() {
  const [loading, setLoading] = useState(true)
  const [landlord, setLandlord] = useState<Landlord | null>(null)
  const [claim, setClaim] = useState<LandlordClaim | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [openDisputes, setOpenDisputes] = useState(0)
  const [responding, setResponding] = useState<string | null>(null)
  const [responseText, setResponseText] = useState('')
  const [submittingResponse, setSubmittingResponse] = useState(false)
  const [expandedRatings, setExpandedRatings] = useState<string | null>(null)
  const [editingProfile, setEditingProfile] = useState(false)
  const [profileWebsite, setProfileWebsite] = useState('')
  const [profilePhone, setProfilePhone] = useState('')
  const [profileDescription, setProfileDescription] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, []) // eslint-disable-line

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const [{ data: profile }, { data: claimData }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase
        .from('landlord_claims')
        .select('*, landlord:landlords(*)')
        .eq('claimed_by', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),
    ])

    if (claimData?.status === 'approved' && claimData.landlord) {
      const l = claimData.landlord as unknown as Landlord
      setLandlord(l)
      setClaim(claimData as unknown as LandlordClaim)
      setProfileWebsite(l.website ?? '')
      setProfilePhone(l.phone ?? '')
      setProfileDescription((l as unknown as { description?: string | null }).description ?? '')
      const [{ data: r }, { data: propIds }] = await Promise.all([
        supabase
          .from('reviews')
          .select('*, reviewer:profiles!reviews_reviewer_id_fkey(full_name, avatar_url)')
          .eq('landlord_id', l.id)
          .eq('status', 'approved')
          .order('created_at', { ascending: false }),
        supabase
          .from('properties')
          .select('id')
          .eq('landlord_id', l.id),
      ])
      setReviews((r ?? []) as Review[])

      const propertyIds = (propIds ?? []).map((p: { id: string }) => p.id)
      const orParts = [`record.landlord_id.eq.${l.id}`]
      if (propertyIds.length) orParts.push(`record.property_id.in.(${propertyIds.join(',')})`)
      // Count open disputes touching this landlord's records (direct OR via their properties)
      const { data: disputes } = await supabase
        .from('record_disputes')
        .select('id, record:public_records(landlord_id, property_id)')
        .eq('status', 'open')
      const ours = (disputes ?? []).filter((d: any) => {
        const rec = d.record as { landlord_id: string | null; property_id: string | null } | null
        if (!rec) return false
        if (rec.landlord_id === l.id) return true
        if (rec.property_id && propertyIds.includes(rec.property_id)) return true
        return false
      })
      setOpenDisputes(ours.length)
    } else if (claimData) {
      setClaim(claimData as unknown as LandlordClaim)
    }
    setLoading(false)
  }

  async function saveProfile() {
    if (!landlord) return
    setSavingProfile(true)
    try {
      const res = await fetch('/api/landlord-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          landlordId: landlord.id,
          website: profileWebsite.trim(),
          phone: profilePhone.trim(),
          description: profileDescription.trim(),
        }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Failed to save')
      }
      toast.success('Profile updated')
      setLandlord({
        ...landlord,
        website: profileWebsite.trim() || null,
        phone: profilePhone.trim() || null,
        // description lives on the Landlord row; cast through an extended shape.
        ...(({ description: profileDescription.trim() || null } as unknown as Partial<Landlord>)),
      })
      setEditingProfile(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSavingProfile(false)
    }
  }

  async function submitResponse(reviewId: string) {
    const cleaned = responseText.replace(/<[^>]*>/g, '').replace(/\0/g, '').trim()
    if (!cleaned || cleaned.length > MAX_RESPONSE_LENGTH) return
    setSubmittingResponse(true)
    try {
      const res = await fetch('/api/landlord-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId, response: cleaned }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Failed to submit response')
      }
      toast.success('Response submitted — it will appear after admin approval')
      setResponding(null)
      setResponseText('')
      loadData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit response')
    } finally {
      setSubmittingResponse(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="h-8 w-8 border-2 border-navy-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // ── Derived stats (for approved dashboard)
  const respondedReviews = reviews.filter(r => r.landlord_response).length
  const verifiedReviews = reviews.filter(r => r.lease_verified).length
  const avgRating = landlord?.avg_rating ?? 0

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header strip */}
      <section className="relative overflow-hidden bg-ink px-7 py-10 text-white">
        <div className="absolute right-0 top-[-40px] h-[200px] w-[200px] rounded-full bg-teal/30 blur-[80px]" />
        <div className="relative mx-auto flex max-w-[1180px] items-center justify-between">
          <div>
            {landlord ? (
              <>
                <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-teal-300">Landlord portal</div>
                <h1 className="mt-3.5 text-[36px] font-extrabold tracking-tight">{landlord.display_name}</h1>
                <div className="mt-1 text-[13.5px] text-slate-400">
                  {landlord.is_verified ? 'Verified' : 'Claimed'} &middot; {landlord.review_count ?? 0} reviews
                  {landlord.city && ` · ${landlord.city}, ${landlord.state_abbr}`}
                </div>
              </>
            ) : (
              <>
                <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-teal-300">Landlord portal</div>
                <h1 className="mt-3.5 text-[36px] font-extrabold tracking-tight">Manage your profile</h1>
              </>
            )}
          </div>
          {landlord && (
            <div className="flex gap-2.5">
              <Button asChild size="sm" variant="outline" className="rounded-full border-white/20 text-white bg-white/5 hover:bg-white/10">
                <Link href={`/landlord/${landlord.slug}`}>View public profile</Link>
              </Button>
              <Button asChild size="sm" className="rounded-full bg-teal hover:bg-teal-500 text-white">
                <Link href="/dispute">Dispute a record</Link>
              </Button>
            </div>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-[1180px] px-7 py-7">
        {/* ── No claim yet ── */}
        {!claim && (
          <div className="rounded-[24px] border border-slate-200 bg-white p-10 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-navy-50">
              <Shield className="h-8 w-8 text-navy-400" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-900">Claim Your Landlord Profile</h2>
            <p className="mx-auto mt-2 max-w-sm text-[14px] leading-relaxed text-slate-500">
              Search for your profile and submit verification documents. Once approved, you can respond to reviews and update your profile.
            </p>
            <Button asChild className="mt-6 rounded-full bg-navy-600 px-6 hover:bg-navy-700 text-white">
              <Link href="/landlord-portal/claim">Claim a Profile</Link>
            </Button>
          </div>
        )}

        {/* ── Pending claim ── */}
        {claim && claim.status === 'pending' && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-100">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h2 className="font-bold text-amber-900">Claim Under Review</h2>
                <p className="mt-1 text-sm leading-relaxed text-amber-800">
                  Your claim for <strong>{(claim.landlord as unknown as Landlord)?.display_name ?? 'your profile'}</strong> is being reviewed. We typically respond within 48 hours.
                </p>
                <p className="mt-2 text-xs text-amber-600">Submitted {formatDate(claim.created_at)}</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Rejected claim ── */}
        {claim && claim.status === 'rejected' && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6">
            <h2 className="font-bold text-red-900">Claim Rejected</h2>
            <p className="mt-1 text-sm text-red-800">{claim.admin_notes ?? 'Your verification documents could not be confirmed. Please try again with different documents.'}</p>
            <Button asChild size="sm" variant="outline" className="mt-4 rounded-full border-red-300 text-red-700 hover:bg-red-100">
              <Link href="/landlord-portal/claim">Try Again</Link>
            </Button>
          </div>
        )}

        {/* ── Approved dashboard ── */}
        {landlord && claim?.status === 'approved' && (
          <div className="grid gap-5">
            {/* KPI row */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {[
                { l: 'Average rating', v: avgRating.toFixed(1), sub: `${landlord.review_count ?? 0} total reviews`, tone: 'teal' },
                { l: 'Total reviews', v: String(reviews.length), sub: `${verifiedReviews} lease-verified`, tone: 'navy' },
                { l: 'Response rate', v: reviews.length > 0 ? `${Math.round((respondedReviews / reviews.length) * 100)}%` : '—', sub: `${respondedReviews} responded`, tone: 'teal' },
                { l: 'Open disputes', v: String(openDisputes), sub: openDisputes === 0 ? 'No open disputes' : `${openDisputes} in review`, tone: 'amber' },
              ].map(s => (
                <div key={s.l} className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
                  <div className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-slate-400">{s.l}</div>
                  <div className={`mt-2 text-[26px] sm:text-[32px] font-extrabold tracking-tight ${s.tone === 'amber' ? 'text-amber-700' : 'text-slate-900'}`}>{s.v}</div>
                  <div className={`mt-1 text-[12px] ${s.tone === 'amber' ? 'text-amber-600' : 'text-teal'}`}>{s.sub}</div>
                </div>
              ))}
            </div>

            {/* Profile info */}
            <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-[18px] font-bold text-slate-900">Public profile</h2>
                {!editingProfile ? (
                  <Button size="sm" variant="outline" onClick={() => setEditingProfile(true)}>Edit</Button>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => {
                      setEditingProfile(false)
                      setProfileWebsite(landlord.website ?? '')
                      setProfilePhone(landlord.phone ?? '')
                      setProfileDescription((landlord as unknown as { description?: string | null }).description ?? '')
                    }} disabled={savingProfile}>Cancel</Button>
                    <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white" onClick={saveProfile} disabled={savingProfile}>
                      {savingProfile ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                      Save
                    </Button>
                  </div>
                )}
              </div>

              {!editingProfile ? (
                <dl className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Website</dt>
                    <dd className="mt-1 text-[14px] text-slate-900">
                      {landlord.website ? <a href={landlord.website} target="_blank" rel="noopener noreferrer" className="text-navy-600 hover:underline break-all">{landlord.website}</a> : <span className="text-slate-400 italic">Not set</span>}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Phone</dt>
                    <dd className="mt-1 text-[14px] text-slate-900">
                      {landlord.phone ? landlord.phone : <span className="text-slate-400 italic">Not set</span>}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">About / description</dt>
                    <dd className="mt-1 text-[14px] text-slate-800 whitespace-pre-wrap">
                      {(landlord as unknown as { description?: string | null }).description
                        ? (landlord as unknown as { description: string }).description
                        : <span className="text-slate-400 italic">Not set — add a short bio so renters know who they&apos;re leasing from.</span>}
                    </dd>
                  </div>
                </dl>
              ) : (
                <div className="grid gap-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Website</span>
                      <input
                        type="url"
                        value={profileWebsite}
                        onChange={e => setProfileWebsite(e.target.value)}
                        placeholder="https://example.com"
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-100"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Phone</span>
                      <input
                        type="tel"
                        value={profilePhone}
                        onChange={e => setProfilePhone(e.target.value)}
                        placeholder="(555) 123-4567"
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-100"
                      />
                    </label>
                  </div>
                  <label className="block">
                    <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                      About / description <span className="font-normal text-slate-400 normal-case tracking-normal">(up to 1200 chars)</span>
                    </span>
                    <textarea
                      value={profileDescription}
                      onChange={e => setProfileDescription(e.target.value.slice(0, 1200))}
                      rows={5}
                      maxLength={1200}
                      placeholder="Who you are, how renters can reach you for maintenance, your response expectations."
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-100"
                    />
                    <p className="mt-1 text-[11px] text-slate-400">{profileDescription.length}/1200</p>
                  </label>
                </div>
              )}
            </div>

            {/* Needs a response */}
            <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-[18px] font-bold text-slate-900">
                  Reviews <span className="font-normal text-slate-400">&middot; {reviews.length}</span>
                </h2>
                {reviews.length > 0 && (
                  <span className="text-[12.5px] text-slate-500">{respondedReviews} of {reviews.length} responded</span>
                )}
              </div>

              {reviews.length === 0 ? (
                <div className="py-12 text-center">
                  <MessageCircle className="mx-auto mb-3 h-8 w-8 text-slate-200" />
                  <p className="font-medium text-slate-500">No approved reviews yet</p>
                  <p className="mt-1 text-xs text-slate-400">Reviews from renters will appear here once approved</p>
                </div>
              ) : (
                <div className="grid gap-2.5">
                  {reviews.map(review => {
                    const hasSubRatings = review.rating_responsiveness || review.rating_maintenance ||
                      review.rating_honesty || review.rating_lease_fairness
                    const isExpanded = expandedRatings === review.id
                    const needsResponse = !review.landlord_response

                    return (
                      <div key={review.id} className={`rounded-[16px] border p-4 transition-colors ${needsResponse ? 'border-slate-200 bg-slate-50' : 'border-slate-100 bg-white'}`}>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <StarRow rating={review.rating_overall} />
                              <span className="font-bold text-[14px] text-slate-900">{review.title}</span>
                              {review.lease_verified && (
                                <Badge className="bg-teal-50 text-teal-800 border-teal-200 text-[10.5px]">
                                  <CheckCircle2 className="h-2.5 w-2.5 mr-1" /> Verified
                                </Badge>
                              )}
                            </div>
                            <p className="text-[13px] leading-relaxed text-slate-600 line-clamp-2">{review.body}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <span className="text-[11.5px] text-slate-400">{formatDate(review.created_at)}</span>
                            {needsResponse && (
                              <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10.5px]">Unanswered</Badge>
                            )}
                          </div>
                        </div>

                        {/* Sub-ratings */}
                        {hasSubRatings && (
                          <button
                            onClick={() => setExpandedRatings(isExpanded ? null : review.id)}
                            className="flex items-center gap-1 text-xs text-navy-600 hover:text-navy-800 mb-2"
                          >
                            <BarChart2 className="h-3 w-3" />
                            {isExpanded ? 'Hide' : 'Show'} ratings
                            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          </button>
                        )}
                        {isExpanded && hasSubRatings && (
                          <div className="mb-3 rounded-xl bg-white p-3 space-y-2">
                            <RatingBar label="Responsiveness" value={review.rating_responsiveness} />
                            <RatingBar label="Maintenance" value={review.rating_maintenance} />
                            <RatingBar label="Honesty" value={review.rating_honesty} />
                            <RatingBar label="Lease Fairness" value={review.rating_lease_fairness} />
                          </div>
                        )}

                        {/* Existing response */}
                        {review.landlord_response && (
                          <div className="mt-2 rounded-xl border border-navy-100 bg-navy-50 p-4">
                            <div className="mb-2 flex items-center gap-2">
                              <MessageSquare className="h-3.5 w-3.5 text-navy-600" />
                              <span className="text-xs font-bold text-navy-700">Your Response</span>
                              {review.landlord_response_status === 'approved' && (
                                <Badge className="ml-auto bg-teal-50 text-teal-700 border-teal-200 text-[10.5px]">Live</Badge>
                              )}
                              {review.landlord_response_status === 'pending' && (
                                <Badge variant="outline" className="ml-auto text-[10.5px] text-amber-700 border-amber-300">Pending</Badge>
                              )}
                            </div>
                            <p className="text-[13px] leading-relaxed text-navy-800">{review.landlord_response}</p>
                          </div>
                        )}

                        {/* Response form */}
                        {!review.landlord_response && landlord.is_verified && (
                          <div className="mt-2">
                            {responding === review.id ? (
                              <div className="overflow-hidden rounded-xl border border-navy-200">
                                <div className="flex items-center gap-2 border-b border-navy-100 bg-navy-50 px-4 py-2">
                                  <MessageSquare className="h-3.5 w-3.5 text-navy-600" />
                                  <span className="text-xs font-semibold text-navy-700">Write a professional response</span>
                                </div>
                                <div className="p-3">
                                  <Textarea
                                    placeholder="Acknowledge the feedback professionally..."
                                    value={responseText}
                                    onChange={e => setResponseText(e.target.value)}
                                    rows={4}
                                    maxLength={MAX_RESPONSE_LENGTH}
                                    className="border-0 p-0 text-sm shadow-none focus-visible:ring-0 resize-none"
                                  />
                                  <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
                                    <span className={`text-xs ${responseText.length > MAX_RESPONSE_LENGTH * 0.9 ? 'text-amber-600' : 'text-slate-400'}`}>
                                      {responseText.length} / {MAX_RESPONSE_LENGTH}
                                    </span>
                                    <div className="flex gap-2">
                                      <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => { setResponding(null); setResponseText('') }}>Cancel</Button>
                                      <Button
                                        size="sm"
                                        className="h-8 rounded-full bg-teal text-xs text-white hover:bg-teal-500"
                                        onClick={() => submitResponse(review.id)}
                                        disabled={!responseText.trim() || responseText.length > MAX_RESPONSE_LENGTH || submittingResponse}
                                      >
                                        {submittingResponse ? <><Loader2 className="mr-1 h-3 w-3 animate-spin" /> Submitting…</> : 'Submit Response'}
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-full text-xs text-navy-700 border-navy-200 hover:bg-navy-50"
                                onClick={() => { setResponding(review.id); setResponseText('') }}
                              >
                                <MessageSquare className="mr-1.5 h-3 w-3" /> Reply
                              </Button>
                            )}
                          </div>
                        )}

                        {!landlord.is_verified && !review.landlord_response && (
                          <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
                            <Flag className="h-3 w-3" /> Profile verification required to respond
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
