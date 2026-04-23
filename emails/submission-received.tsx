import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Heading,
  Text,
  Hr,
  Link,
} from '@react-email/components'

export type SubmissionKind = 'review' | 'landlord' | 'claim' | 'dispute' | 'response'

interface SubmissionReceivedEmailProps {
  firstName?: string
  kind: SubmissionKind
  target?: string
  eta?: string
}

const COPY: Record<SubmissionKind, { label: string; heading: string; body: (target?: string) => string; eta: string; cta: { href: string; text: string } }> = {
  review: {
    label: 'Review',
    heading: 'We got your review.',
    body: (target) => `Thanks for taking the time to write up your experience${target ? ` with ${target}` : ''}. We'll verify your lease document and publish your review once it checks out — usually within 48 hours. You'll get another email the moment it goes live.`,
    eta: '48 hours',
    cta: { href: 'https://vettrentals.com/dashboard', text: 'View your dashboard' },
  },
  landlord: {
    label: 'Landlord submission',
    heading: 'Thanks — we\'ll add this landlord.',
    body: (target) => `${target ? `Your submission for ${target}` : 'Your submission'} is in our review queue. We verify every landlord before publishing to keep the database accurate. Most submissions are reviewed within 1–2 business days. You'll hear from us when it's live.`,
    eta: '1–2 business days',
    cta: { href: 'https://vettrentals.com/dashboard', text: 'View your dashboard' },
  },
  claim: {
    label: 'Landlord claim',
    heading: 'We received your claim request.',
    body: (target) => `Your claim${target ? ` for ${target}` : ''} is being reviewed. Our team typically responds within 48 hours. Once approved, you'll be able to respond to reviews and update your public profile.`,
    eta: '48 hours',
    cta: { href: 'https://vettrentals.com/landlord-portal', text: 'Open the landlord portal' },
  },
  dispute: {
    label: 'Record dispute',
    heading: 'Your dispute is in review.',
    body: (target) => `We received your dispute${target ? ` regarding ${target}` : ''}. Our team reviews disputes within 5–7 business days. If we find the record is inaccurate, we'll update or remove it. For source-data errors, we'll refer you to the government agency that owns the record.`,
    eta: '5–7 business days',
    cta: { href: 'https://vettrentals.com/dashboard', text: 'View your dashboard' },
  },
  response: {
    label: 'Landlord response',
    heading: 'We received your response.',
    body: (target) => `Your response${target ? ` on ${target}` : ''} is pending admin review. Once approved, it will appear publicly under the original review.`,
    eta: '48 hours',
    cta: { href: 'https://vettrentals.com/landlord-portal', text: 'Open the landlord portal' },
  },
}

export default function SubmissionReceivedEmail({ firstName, kind, target, eta }: SubmissionReceivedEmailProps) {
  const copy = COPY[kind]
  const displayEta = eta ?? copy.eta
  return (
    <Html>
      <Head />
      <Preview>{copy.heading} We typically review within {displayEta}.</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <div style={logoLockup}>
              <div style={logoIcon}>V</div>
              <span style={logoText}>Vett</span>
            </div>
          </Section>

          <Section style={content}>
            <div style={pendingPill}>
              <span style={pendingDot} /> {copy.label} pending review
            </div>
            <Heading as="h1" style={h1}>{copy.heading}</Heading>
            <Text style={greet}>Hi {firstName ?? 'there'},</Text>
            <Text style={bodyText}>{copy.body(target)}</Text>

            <div style={etaBox}>
              <Text style={etaLabel}>Expected turnaround</Text>
              <Text style={etaValue}>{displayEta}</Text>
            </div>

            <Section style={ctaSection}>
              <Link href={copy.cta.href} style={primaryButton}>
                {copy.cta.text}
              </Link>
            </Section>

            <Hr style={hr} />
            <Text style={footer}>
              You received this because you submitted a {copy.label.toLowerCase()} on Vett.
              <br />
              <Link href="https://vettrentals.com/unsubscribe" style={footerLink}>Manage emails</Link>{' '}·{' '}
              <Link href="https://vettrentals.com/privacy" style={footerLink}>Privacy</Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

const body: React.CSSProperties = { backgroundColor: '#f3f4f6', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', margin: 0, padding: '24px 0' }
const container: React.CSSProperties = { maxWidth: '560px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }
const header: React.CSSProperties = { backgroundColor: '#0f2744', padding: '20px 32px' }
const logoLockup: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: '10px' }
const logoIcon: React.CSSProperties = { width: '32px', height: '32px', borderRadius: '7px', backgroundColor: '#0f7b6c', color: '#ffffff', fontSize: '12px', fontWeight: '800', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }
const logoText: React.CSSProperties = { color: '#ffffff', fontSize: '18px', fontWeight: '700' }
const content: React.CSSProperties = { padding: '28px 36px 32px' }
const pendingPill: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: '#fef3c7', color: '#92400e', padding: '5px 12px', borderRadius: '100px', fontSize: '12px', fontWeight: '700', marginBottom: '14px' }
const pendingDot: React.CSSProperties = { width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#d97706', display: 'inline-block' }
const h1: React.CSSProperties = { fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: '0 0 14px', letterSpacing: '-0.4px', lineHeight: '1.2' }
const greet: React.CSSProperties = { fontSize: '15px', fontWeight: '600', color: '#111827', margin: '0 0 8px' }
const bodyText: React.CSSProperties = { fontSize: '14px', color: '#4b5563', lineHeight: '1.65', margin: '0 0 20px' }
const etaBox: React.CSSProperties = { backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', marginBottom: '22px' }
const etaLabel: React.CSSProperties = { fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.06em', margin: '0 0 3px' }
const etaValue: React.CSSProperties = { fontSize: '14px', fontWeight: '700', color: '#0f172a', margin: 0 }
const ctaSection: React.CSSProperties = { textAlign: 'center' as const, marginBottom: '16px' }
const primaryButton: React.CSSProperties = { backgroundColor: '#0f7b6c', color: '#ffffff', borderRadius: '10px', padding: '13px 24px', textDecoration: 'none', fontSize: '14px', fontWeight: '700', display: 'inline-block' }
const hr: React.CSSProperties = { borderColor: '#e5e7eb', borderTopWidth: '1px', margin: '24px 0 18px' }
const footer: React.CSSProperties = { fontSize: '11px', color: '#9ca3af', lineHeight: '1.6', textAlign: 'center' as const, margin: 0 }
const footerLink: React.CSSProperties = { color: '#9ca3af', textDecoration: 'underline' }
