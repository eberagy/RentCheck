import { Resend } from 'resend'

export const resend = new Resend(process.env.RESEND_API_KEY)

export const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'hello@rentcheck.app'
export const APP_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://rentcheck.app'

export async function sendEmail({
  to,
  subject,
  react,
}: {
  to: string
  subject: string
  react: React.ReactElement
}) {
  try {
    const { data, error } = await resend.emails.send({
      from: `RentCheck <${FROM_EMAIL}>`,
      to,
      subject,
      react,
    })
    if (error) throw error
    return { success: true, id: data?.id }
  } catch (err) {
    console.error('[Resend] Send failed:', err)
    return { success: false, error: err }
  }
}
