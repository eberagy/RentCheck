import { Resend } from 'resend'
import { render } from '@react-email/render'
import WelcomeEmail from '@/emails/welcome'
import ReviewApprovedEmail from '@/emails/review-approved'
import ReviewRejectedEmail from '@/emails/review-rejected'
import ClaimApprovedEmail from '@/emails/claim-approved'
import WatchlistAlertEmail from '@/emails/watchlist-alert'

const FROM = process.env.RESEND_FROM_EMAIL ?? 'RentCheck <noreply@rentcheck.app>'

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
  await sendEmail(to, 'Welcome to RentCheck', WelcomeEmail({ firstName }) as any)
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
  await sendEmail(to, 'Update on your RentCheck review', ReviewRejectedEmail(props) as any)
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
