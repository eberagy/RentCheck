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
  const [responding, setResponding] = useState<string | null>(null)
  const [responseText, setResponseText] = useState('')
  const [submittingResponse, setSubmittingResponse] = useState(false)
  const [expandedRatings, setExpandedRatings] = useState<string | null>(null)
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
      const { data: r } = await supabase
        .from('reviews')
        .select('*, reviewer:profiles(full_name, avatar_url)')
        .eq('landlord_id', l.id)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
      setReviews((r ?? []) as Review[])
    } else if (claimData) {
      setClaim(claimData as unknown as LandlordClaim)
    }
    setLoading(false)
  }

  async function submitResponse(reviewId: string) {
    if (!responseText.trim() || responseText.length > MAX_RESPONSE_LENGTH) return
    setSubmittingResponse(true)
    try {
      const { error } = await supabase
        .from('reviews')
        .update({ landlord_response: responseText, landlord_response_status: 'pending' })
        .eq('id', reviewId)
      if (error) throw error
      toast.success('Response submitted — it will appear after admin approval')
      setResponding(null)
      setResponseText('')
      loadData()
    } catch {
      toast.error('Failed to submit response')
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
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-navy-900 mb-6">Landlord Portal</h1>

      {/* ── No claim yet ─────────────────────────────────────── */}
      {!claim && (
        <Card className="border-gray-200">
          <CardContent className="p-10 text-center">
            <div className="h-16 w-16 bg-navy-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Shield className="h-8 w-8 text-navy-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Claim Your Landlord Profile</h2>
            <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto leading-relaxed">
              Search for your profile and submit verification documents. Once approved, you can respond
              to reviews and update your profile.
            </p>
            <Button asChild className="bg-navy-600 hover:bg-navy-700 text-white px-6">
              <Link href="/landlord-portal/claim">Claim a Profile</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Pending claim ────────────────────────────────────── */}
      {claim && claim.status === 'pending' && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h2 className="font-bold text-amber-900">Claim Under Review</h2>
                <p className="text-sm text-amber-800 mt-1 leading-relaxed">
                  Your claim for{' '}
                  <strong>{(claim.landlord as unknown as Landlord)?.display_name ?? 'your profile'}</strong>{' '}
                  is being reviewed. We typically respond within 48 hours.
                </p>
                <p className="text-xs text-amber-600 mt-2">Submitted {formatDate(claim.created_at)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Rejected claim ───────────────────────────────────── */}
      {claim && claim.status === 'rejected' && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <h2 className="font-bold text-red-900">Claim Rejected</h2>
            <p className="text-sm text-red-800 mt-1">
              {claim.admin_notes ?? 'Your verification documents could not be confirmed. Please try again with different documents.'}
            </p>
            <Button asChild size="sm" variant="outline" className="mt-4 border-red-300 text-red-700 hover:bg-red-100">
              <Link href="/landlord-portal/claim">Try Again</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Approved dashboard ───────────────────────────────── */}
      {landlord && claim?.status === 'approved' && (
        <div className="space-y-6">

          {/* Profile Summary Card */}
          <Card className="border-navy-100 bg-gradient-to-br from-navy-900 to-navy-800 text-white overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-xl font-bold text-white">{landlord.display_name}</h2>
                    {landlord.grade && (
                      <span className={`text-sm font-bold px-2.5 py-0.5 rounded-md ${gradeColor(landlord.grade as LandlordGrade)}`}>
                        Grade {landlord.grade}
                      </span>
                    )}
                  </div>
                  {landlord.city && (
                    <p className="text-navy-300 text-sm">{landlord.city}, {landlord.state_abbr}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    {landlord.is_verified ? (
                      <Badge className="bg-teal-500/20 text-teal-300 border-teal-500/30 text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Verified
                      </Badge>
                    ) : (
                      <Badge className="bg-white/10 text-white/60 border-white/20 text-xs">Claimed</Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-4xl font-bold text-white">{avgRating.toFixed(1)}</span>
                  <div className="ml-1">
                    <StarRow rating={avgRating} />
                    <p className="text-navy-300 text-xs mt-0.5">{landlord.review_count} reviews</p>
                  </div>
                </div>
              </div>

              {/* Profile Stats mini row */}
              <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-white/10">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{avgRating.toFixed(1)}</div>
                  <div className="text-xs text-navy-300 mt-0.5">Avg Rating</div>
                </div>
                <div className="text-center border-x border-white/10">
                  <div className="text-2xl font-bold text-white">{verifiedReviews}</div>
                  <div className="text-xs text-navy-300 mt-0.5">Verified Reviews</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{respondedReviews}</div>
                  <div className="text-xs text-navy-300 mt-0.5">Responses Made</div>
                </div>
              </div>

              <div className="mt-5 flex gap-2">
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="border-white/30 text-white bg-white/10 hover:bg-white/20"
                >
                  <Link href={`/landlord/${landlord.slug}`}>
                    View Public Profile <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Reviews Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-navy-600" />
                Renter Reviews
                <span className="text-sm font-normal text-gray-500">({reviews.length})</span>
              </h2>
              {reviews.length > 0 && (
                <span className="text-xs text-gray-500">
                  {respondedReviews} of {reviews.length} responded
                </span>
              )}
            </div>

            {reviews.length === 0 ? (
              <Card className="border-gray-200">
                <CardContent className="py-12 text-center">
                  <MessageCircle className="h-8 w-8 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No approved reviews yet</p>
                  <p className="text-xs text-gray-400 mt-1">Reviews from renters will appear here once approved</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {reviews.map(review => {
                  const hasSubRatings = review.rating_responsiveness || review.rating_maintenance ||
                    review.rating_honesty || review.rating_lease_fairness
                  const isExpanded = expandedRatings === review.id

                  return (
                    <Card key={review.id} className="border-gray-200 hover:border-gray-300 transition-colors">
                      <CardContent className="p-5">
                        {/* Review header */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="font-semibold text-gray-900">{review.title}</span>
                              {review.lease_verified && (
                                <Badge className="bg-teal-100 text-teal-800 border-teal-200 text-xs">
                                  <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                                  Verified Renter
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                              <StarRow rating={review.rating_overall} />
                              <span className={`text-sm font-semibold ${ratingToColor(review.rating_overall)}`}>
                                {review.rating_overall}/5
                              </span>
                              {review.would_rent_again !== null && (
                                <>
                                  <span className="text-gray-300 text-xs">·</span>
                                  <span className={`text-xs font-medium ${review.would_rent_again ? 'text-teal-600' : 'text-red-500'}`}>
                                    {review.would_rent_again ? 'Would rent again' : 'Would not rent again'}
                                  </span>
                                </>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">{review.body}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <span className="text-xs text-gray-400">{formatDate(review.created_at)}</span>
                            {(review.reviewer as any)?.full_name && (
                              <p className="text-xs text-gray-500 mt-0.5">{formatReviewerName((review.reviewer as any).full_name)}</p>
                            )}
                          </div>
                        </div>

                        {/* Sub-ratings toggle */}
                        {hasSubRatings && (
                          <button
                            onClick={() => setExpandedRatings(isExpanded ? null : review.id)}
                            className="flex items-center gap-1 text-xs text-navy-600 hover:text-navy-800 mb-3 transition-colors"
                          >
                            <BarChart2 className="h-3 w-3" />
                            {isExpanded ? 'Hide' : 'Show'} category ratings
                            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          </button>
                        )}
                        {isExpanded && hasSubRatings && (
                          <div className="bg-gray-50 rounded-lg p-3 mb-3 space-y-2">
                            <RatingBar label="Responsiveness" value={review.rating_responsiveness} />
                            <RatingBar label="Maintenance" value={review.rating_maintenance} />
                            <RatingBar label="Honesty" value={review.rating_honesty} />
                            <RatingBar label="Lease Fairness" value={review.rating_lease_fairness} />
                          </div>
                        )}

                        {/* Existing response */}
                        {review.landlord_response && (
                          <div className="bg-navy-50 border border-navy-100 rounded-xl p-4 mt-3">
                            <div className="flex items-center gap-2 mb-2">
                              <MessageSquare className="h-3.5 w-3.5 text-navy-600" />
                              <p className="text-xs font-bold text-navy-700">Your Response</p>
                              {review.landlord_response_status === 'pending' && (
                                <Badge variant="outline" className="text-xs text-amber-700 border-amber-300 ml-auto">
                                  Pending approval
                                </Badge>
                              )}
                              {review.landlord_response_status === 'approved' && (
                                <Badge className="bg-teal-100 text-teal-700 border-teal-200 text-xs ml-auto">
                                  Live
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-navy-800 leading-relaxed">{review.landlord_response}</p>
                          </div>
                        )}

                        {/* Response form */}
                        {!review.landlord_response && landlord.is_verified && (
                          <div className="mt-3">
                            {responding === review.id ? (
                              <div className="border border-navy-200 rounded-xl overflow-hidden">
                                <div className="px-4 py-2 bg-navy-50 border-b border-navy-100 flex items-center gap-2">
                                  <MessageSquare className="h-3.5 w-3.5 text-navy-600" />
                                  <span className="text-xs font-semibold text-navy-700">Write a professional response</span>
                                </div>
                                <div className="p-3">
                                  <Textarea
                                    placeholder="Acknowledge the feedback professionally. Avoid being defensive — prospective renters will see this response."
                                    value={responseText}
                                    onChange={e => setResponseText(e.target.value)}
                                    rows={4}
                                    maxLength={MAX_RESPONSE_LENGTH}
                                    className="text-sm border-0 shadow-none focus-visible:ring-0 resize-none p-0"
                                  />
                                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                                    <span className={`text-xs ${responseText.length > MAX_RESPONSE_LENGTH * 0.9 ? 'text-amber-600' : 'text-gray-400'}`}>
                                      {responseText.length} / {MAX_RESPONSE_LENGTH}
                                    </span>
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 text-xs"
                                        onClick={() => { setResponding(null); setResponseText('') }}
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        size="sm"
                                        className="h-8 text-xs bg-navy-600 hover:bg-navy-700 text-white"
                                        onClick={() => submitResponse(review.id)}
                                        disabled={!responseText.trim() || responseText.length > MAX_RESPONSE_LENGTH || submittingResponse}
                                      >
                                        {submittingResponse
                                          ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Submitting…</>
                                          : 'Submit Response'
                                        }
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs text-navy-700 border-navy-200 hover:bg-navy-50"
                                onClick={() => { setResponding(review.id); setResponseText('') }}
                              >
                                <MessageSquare className="h-3 w-3 mr-1.5" />
                                Respond to Review
                              </Button>
                            )}
                          </div>
                        )}

                        {!landlord.is_verified && !review.landlord_response && (
                          <p className="mt-3 text-xs text-gray-400 flex items-center gap-1.5">
                            <Flag className="h-3 w-3" />
                            Profile verification required to respond to reviews
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
