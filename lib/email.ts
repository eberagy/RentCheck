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
