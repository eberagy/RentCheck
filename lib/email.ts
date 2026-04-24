import { Resend } from 'resend'
import { render } from '@react-email/render'
import WelcomeEmail from '@/emails/welcome'
import ReviewApprovedEmail from '@/emails/review-approved'
import ReviewRejectedEmail from '@/emails/review-rejected'
import ClaimApprovedEmail from '@/emails/claim-approved'
import WatchlistAlertEmail from '@/emails/watchlist-alert'
import SubmissionApprovedEmail from '@/emails/submission-approved'
import SubmissionRejectedEmail from '@/emails/submission-rejected'
import ClaimRejectedEmail from '@/emails/claim-rejected'
import ResponseApprovedEmail from '@/emails/response-approved'
import ResponseRejectedEmail from '@/emails/response-rejected'
import AdminDigestEmail, { type AdminDigestCounts } from '@/emails/admin-digest'
import SubmissionReceivedEmail, { type SubmissionKind } from '@/emails/submission-received'
import DisputeResolvedEmail, { type DisputeDecision } from '@/emails/dispute-resolved'
import SavedSearchDigestEmail from '@/emails/saved-search-digest'

const FROM = process.env.RESEND_FROM_EMAIL ?? 'Vett <noreply@vettrentals.com>'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

async function sendEmail(to: string, subject: string, react: React.ReactElement) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY not set — email not sent')
    return
  }
  const html = await render(react)
  const { error } = await getResend().emails.send({ from: FROM, to, subject, html })
  if (error) console.error('[email] Send error:', error)
}

export async function sendWelcomeEmail(to: string, firstName?: string) {
  await sendEmail(to, 'Welcome to Vett', WelcomeEmail({ firstName }) as any)
}

export async function sendReviewApprovedEmail(to: string, props: {
  firstName?: string
  reviewTitle: string
  landlordName: string
  landlordSlug: string
}) {
  await sendEmail(to, `Your review of ${props.landlordName} is live`, ReviewApprovedEmail(props) as any)
}

export async function sendReviewRejectedEmail(to: string, props: {
  firstName?: string
  reviewTitle: string
  reason?: string
}) {
  await sendEmail(to, 'Update on your Vett review', ReviewRejectedEmail(props) as any)
}

export async function sendClaimApprovedEmail(to: string, props: {
  firstName?: string
  landlordName: string
  landlordSlug: string
}) {
  await sendEmail(to, `Your claim for ${props.landlordName} is approved`, ClaimApprovedEmail(props) as any)
}

export async function sendWatchlistAlertEmail(to: string, props: {
  firstName?: string
  landlordName: string
  landlordSlug: string
  alertType: 'new_review' | 'new_violation' | 'new_court_case'
  summary: string
}) {
  const labels = { new_review: 'New review', new_violation: 'New violation', new_court_case: 'New court case' }
  await sendEmail(to, `${labels[props.alertType]}: ${props.landlordName}`, WatchlistAlertEmail(props) as any)
}

export async function sendSubmissionApprovedEmail(to: string, props: {
  firstName?: string
  landlordName: string
  landlordSlug: string
}) {
  await sendEmail(to, `${props.landlordName} is now on Vett — write your review!`, SubmissionApprovedEmail(props) as any)
}

export async function sendSubmissionRejectedEmail(to: string, props: {
  firstName?: string
  landlordName: string
  reason?: string
  isDuplicate?: boolean
}) {
  const subject = props.isDuplicate
    ? `${props.landlordName} is already on Vett`
    : `Update on your Vett submission`
  await sendEmail(to, subject, SubmissionRejectedEmail(props) as any)
}

export async function sendClaimRejectedEmail(to: string, props: {
  firstName?: string
  landlordName: string
  reason?: string
}) {
  await sendEmail(to, `Update on your claim for ${props.landlordName}`, ClaimRejectedEmail(props) as any)
}

export async function sendResponseApprovedEmail(to: string, props: {
  firstName?: string
  landlordName: string
  landlordSlug: string
  reviewTitle?: string
}) {
  await sendEmail(to, `Your response on ${props.landlordName} is live`, ResponseApprovedEmail(props) as any)
}

export async function sendResponseRejectedEmail(to: string, props: {
  firstName?: string
  landlordName: string
  reason?: string
}) {
  await sendEmail(to, `Update on your response`, ResponseRejectedEmail(props) as any)
}

export async function sendAdminDigestEmail(to: string, counts: AdminDigestCounts) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  const subject = total === 0 ? 'Vett admin: all queues empty' : `Vett admin: ${total} ${total === 1 ? 'item' : 'items'} need attention`
  await sendEmail(to, subject, AdminDigestEmail({ counts }) as any)
}

const SUBMISSION_SUBJECTS: Record<SubmissionKind, string> = {
  review: 'We got your review — verifying now',
  landlord: 'Your landlord submission is in review',
  claim: 'Your claim request is in review',
  dispute: 'Your dispute is in review',
  response: 'Your response is in review',
}

export async function sendSubmissionReceivedEmail(to: string, props: {
  firstName?: string
  kind: SubmissionKind
  target?: string
  eta?: string
}) {
  await sendEmail(to, SUBMISSION_SUBJECTS[props.kind], SubmissionReceivedEmail(props) as any)
}

const DISPUTE_SUBJECTS: Record<DisputeDecision, string> = {
  record_removed: 'Your disputed record was removed',
  record_updated: 'Your disputed record was updated',
  no_action: 'Update on your record dispute',
  refer_to_source: 'Update on your record dispute',
}

export async function sendDisputeResolvedEmail(to: string, props: {
  firstName?: string
  decision: DisputeDecision
  recordLabel?: string
  adminNotes?: string
}) {
  await sendEmail(to, DISPUTE_SUBJECTS[props.decision], DisputeResolvedEmail(props) as any)
}

export async function sendSavedSearchDigestEmail(to: string, props: {
  firstName?: string
  city: string
  stateAbbr: string
  newReviewCount: number
  newLandlords: Array<{ name: string; slug: string; rating: number | null; reviewCount: number }>
  unsubscribeToken?: string
}) {
  await sendEmail(
    to,
    `This week in ${props.city}: ${props.newReviewCount} new review${props.newReviewCount === 1 ? '' : 's'}`,
    SavedSearchDigestEmail(props) as any,
  )
}
