import { Resend } from 'resend'
import { render } from '@react-email/render'
import { captureException } from '@/lib/sentry'
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
import CityAlertConfirmationEmail from '@/emails/city-alert-confirmation'

const FROM = process.env.RESEND_FROM_EMAIL ?? 'Vett <noreply@vettrentals.com>'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

interface SendOpts {
  /** Token-signed unsubscribe identifier. When provided, emits the
   *  RFC 8058 List-Unsubscribe + List-Unsubscribe-Post headers so
   *  Gmail/Yahoo show the inbox-level "Unsubscribe" button.
   *  https://datatracker.ietf.org/doc/html/rfc8058 */
  unsubscribeToken?: string
}

async function sendEmail(
  to: string,
  subject: string,
  react: React.ReactElement,
  opts: SendOpts = {},
) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY not set — email not sent')
    return
  }
  try {
    const html = await render(react)
    // RFC 8058 + Gmail/Yahoo 2024 sender requirements: bulk senders
    // need a one-click unsubscribe in the message headers, not just
    // in the body. /api/unsubscribe handles the POST with the form
    // body `List-Unsubscribe=One-Click`. Header is only emitted when
    // the caller passes a token — transactional emails (welcome,
    // claim-approved) don't need it; commercial emails (watchlist
    // alerts, saved-search digest, city-alert confirmation) do.
    const headers: Record<string, string> | undefined = opts.unsubscribeToken
      ? {
          'List-Unsubscribe': `<https://www.vettrentals.com/api/unsubscribe?token=${encodeURIComponent(opts.unsubscribeToken)}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        }
      : undefined
    const { error } = await getResend().emails.send({
      from: FROM,
      to,
      subject,
      html,
      ...(headers ? { headers } : {}),
    })
    if (error) {
      console.error('[email] Send error:', error)
      // Resend returned-error path: bounces, domain not verified, rate
      // limits. PII note: subject is logged but `to` is not, since
      // renter email addresses are PII that we keep out of Sentry's
      // 90-day retention window. Same in the throw branch below.
      captureException(error, { where: 'sendEmail', subject })
    }
  } catch (err) {
    // Throw path: react-email render failure, network error to Resend,
    // unexpected SDK exception. Without this branch, callers using the
    // .catch(err => console.error(...)) idiom (see admin moderate
    // routes) caught the error but it never reached Sentry — so a
    // template change that broke render() would only surface via
    // missing emails. Re-throw so callers' .catch still fires.
    captureException(err, { where: 'sendEmail:throw', subject })
    throw err
  }
}

export async function sendWelcomeEmail(to: string, firstName?: string) {
  await sendEmail(to, 'Welcome to Vett', WelcomeEmail({ firstName }) as React.ReactElement)
}

export async function sendReviewApprovedEmail(to: string, props: {
  firstName?: string
  reviewTitle: string
  landlordName: string
  landlordSlug: string
}) {
  await sendEmail(to, `Your review of ${props.landlordName} is live`, ReviewApprovedEmail(props) as React.ReactElement)
}

export async function sendReviewRejectedEmail(to: string, props: {
  firstName?: string
  reviewTitle: string
  reason?: string
}) {
  await sendEmail(to, 'Update on your Vett review', ReviewRejectedEmail(props) as React.ReactElement)
}

export async function sendClaimApprovedEmail(to: string, props: {
  firstName?: string
  landlordName: string
  landlordSlug: string
}) {
  await sendEmail(to, `Your claim for ${props.landlordName} is approved`, ClaimApprovedEmail(props) as React.ReactElement)
}

export async function sendWatchlistAlertEmail(to: string, props: {
  firstName?: string
  landlordName: string
  landlordSlug: string
  alertType: 'new_review' | 'new_violation' | 'new_court_case'
  summary: string
  unsubscribeToken?: string
}) {
  const labels = { new_review: 'New review', new_violation: 'New violation', new_court_case: 'New court case' }
  await sendEmail(
    to,
    `${labels[props.alertType]}: ${props.landlordName}`,
    WatchlistAlertEmail(props) as React.ReactElement,
    { unsubscribeToken: props.unsubscribeToken },
  )
}

export async function sendSubmissionApprovedEmail(to: string, props: {
  firstName?: string
  landlordName: string
  landlordSlug: string
}) {
  await sendEmail(to, `${props.landlordName} is now on Vett — write your review!`, SubmissionApprovedEmail(props) as React.ReactElement)
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
  await sendEmail(to, subject, SubmissionRejectedEmail(props) as React.ReactElement)
}

export async function sendClaimRejectedEmail(to: string, props: {
  firstName?: string
  landlordName: string
  reason?: string
}) {
  await sendEmail(to, `Update on your claim for ${props.landlordName}`, ClaimRejectedEmail(props) as React.ReactElement)
}

export async function sendResponseApprovedEmail(to: string, props: {
  firstName?: string
  landlordName: string
  landlordSlug: string
  reviewTitle?: string
}) {
  await sendEmail(to, `Your response on ${props.landlordName} is live`, ResponseApprovedEmail(props) as React.ReactElement)
}

export async function sendResponseRejectedEmail(to: string, props: {
  firstName?: string
  landlordName: string
  reason?: string
}) {
  await sendEmail(to, `Update on your response`, ResponseRejectedEmail(props) as React.ReactElement)
}

export async function sendAdminDigestEmail(to: string, counts: AdminDigestCounts) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  const subject = total === 0 ? 'Vett admin: all queues empty' : `Vett admin: ${total} ${total === 1 ? 'item' : 'items'} need attention`
  await sendEmail(to, subject, AdminDigestEmail({ counts }) as React.ReactElement)
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
  await sendEmail(to, SUBMISSION_SUBJECTS[props.kind], SubmissionReceivedEmail(props) as React.ReactElement)
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
  await sendEmail(to, DISPUTE_SUBJECTS[props.decision], DisputeResolvedEmail(props) as React.ReactElement)
}

export async function sendCityAlertConfirmationEmail(to: string, props: { city: string; stateAbbr: string; unsubscribeToken?: string }) {
  await sendEmail(
    to,
    `You're on the list for ${props.city}, ${props.stateAbbr}`,
    CityAlertConfirmationEmail(props) as React.ReactElement,
    { unsubscribeToken: props.unsubscribeToken },
  )
}

export async function sendSavedSearchDigestEmail(to: string, props: {
  firstName?: string
  city: string
  stateAbbr: string
  cityUrl?: string
  newReviewCount: number
  newLandlords: Array<{ name: string; slug: string; rating: number | null; reviewCount: number }>
  unsubscribeToken?: string
}) {
  await sendEmail(
    to,
    `This week in ${props.city}: ${props.newReviewCount} new review${props.newReviewCount === 1 ? '' : 's'}`,
    SavedSearchDigestEmail(props) as React.ReactElement,
    { unsubscribeToken: props.unsubscribeToken },
  )
}
