import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Heading,
  Text,
  Button,
  Hr,
  Link,
  Row,
  Column,
} from '@react-email/components'

interface ReviewApprovedEmailProps {
  firstName?: string
  reviewTitle: string
  landlordName: string
  landlordSlug: string
}

export default function ReviewApprovedEmail({
  firstName,
  reviewTitle,
  landlordName,
  landlordSlug,
}: ReviewApprovedEmailProps) {
  const landlordUrl = `https://rentcheck.app/landlord/${landlordSlug}`

  return (
    <Html>
      <Head />
      <Preview>
        Your review of {landlordName} is now live — help others find it
      </Preview>
      <Body style={body}>
        <Container style={container}>
          {/* ── Header bar ── */}
          <Section style={header}>
            <div style={logoLockup}>
              <div style={logoIcon}>RC</div>
              <span style={logoText}>RentCheck</span>
            </div>
          </Section>

          {/* ── Success hero ── */}
          <Section style={successBanner}>
            <div style={checkCircle}>✓</div>
            <Heading as="h1" style={successHeading}>
              Your review is live!
            </Heading>
            <Text style={successSub}>
              Other renters can now read your experience.
            </Text>
          </Section>

          {/* ── Review details card ── */}
          <Section style={content}>
            <Text style={greetText}>Hi {firstName ?? 'there'},</Text>
            <Text style={bodyText}>
              Your review has been approved and is now publicly visible on RentCheck. Thank you
              for helping make renting safer and more transparent for everyone.
            </Text>

            {/* Review summary card */}
            <div style={reviewCard}>
              <div style={reviewCardHeader}>
                <Text style={reviewCardLabel}>Approved Review</Text>
              </div>
              <div style={reviewCardBody}>
                <Text style={reviewTitleText}>&ldquo;{reviewTitle}&rdquo;</Text>
                <Row>
                  <Column>
                    <Text style={reviewMeta}>
                      <span style={metaLabel}>Landlord</span>
                      <br />
                      <span style={metaValue}>{landlordName}</span>
                    </Text>
                  </Column>
                  <Column>
                    <Text style={reviewMeta}>
                      <span style={metaLabel}>Status</span>
                      <br />
                      <span style={approvedBadge}>Published</span>
                    </Text>
                  </Column>
                </Row>
              </div>
            </div>

            {/* Primary CTA */}
            <Section style={ctaSection}>
              <Button style={primaryButton} href={landlordUrl}>
                View Your Review on {landlordName}&apos;s Profile
              </Button>
            </Section>

            {/* ── Share your review ── */}
            <div style={shareSection}>
              <div style={shareIcon}>↗</div>
              <div>
                <Text style={shareTitle}>Share your review</Text>
                <Text style={shareDesc}>
                  Know someone looking to rent from {landlordName}? Share the link below — your
                  review could save them from a bad experience.
                </Text>
                <div style={shareLinkBox}>
                  <Link href={landlordUrl} style={shareLinkText}>
                    {landlordUrl}
                  </Link>
                </div>
              </div>
            </div>

            <Hr style={hr} />

            <Text style={footer}>
              You received this because you submitted a review on RentCheck.
              <br />
              <Link href="https://rentcheck.app/privacy" style={footerLink}>
                Privacy Policy
              </Link>{' '}
              ·{' '}
              <Link href="https://rentcheck.app/unsubscribe" style={footerLink}>
                Unsubscribe
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

// ── Styles ──────────────────────────────────────────────────────────────────

const body: React.CSSProperties = {
  backgroundColor: '#f3f4f6',
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  margin: '0',
  padding: '24px 0',
}

const container: React.CSSProperties = {
  maxWidth: '560px',
  margin: '0 auto',
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  overflow: 'hidden',
  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
}

// Header
const header: React.CSSProperties = {
  backgroundColor: '#0f2744',
  padding: '20px 32px',
}

const logoLockup: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '10px',
}

const logoIcon: React.CSSProperties = {
  width: '32px',
  height: '32px',
  borderRadius: '7px',
  backgroundColor: '#0f7b6c',
  color: '#ffffff',
  fontSize: '12px',
  fontWeight: '800',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  letterSpacing: '-0.5px',
}

const logoText: React.CSSProperties = {
  color: '#ffffff',
  fontSize: '18px',
  fontWeight: '700',
}

// Success hero
const successBanner: React.CSSProperties = {
  background: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)',
  padding: '32px 36px',
  textAlign: 'center' as const,
}

const checkCircle: React.CSSProperties = {
  width: '52px',
  height: '52px',
  borderRadius: '50%',
  backgroundColor: 'rgba(255,255,255,0.15)',
  color: '#ffffff',
  fontSize: '26px',
  fontWeight: '700',
  lineHeight: '52px',
  textAlign: 'center' as const,
  display: 'inline-block',
  marginBottom: '14px',
}

const successHeading: React.CSSProperties = {
  color: '#ffffff',
  fontSize: '22px',
  fontWeight: '800',
  margin: '0 0 8px',
  letterSpacing: '-0.4px',
}

const successSub: React.CSSProperties = {
  color: '#6ee7b7',
  fontSize: '14px',
  margin: '0',
}

// Content
const content: React.CSSProperties = {
  padding: '28px 36px 32px',
}

const greetText: React.CSSProperties = {
  fontSize: '15px',
  fontWeight: '600',
  color: '#111827',
  margin: '0 0 8px',
}

const bodyText: React.CSSProperties = {
  fontSize: '14px',
  color: '#4b5563',
  lineHeight: '1.65',
  margin: '0 0 20px',
}

// Review card
const reviewCard: React.CSSProperties = {
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  overflow: 'hidden',
  marginBottom: '24px',
}

const reviewCardHeader: React.CSSProperties = {
  backgroundColor: '#f9fafb',
  padding: '10px 16px',
  borderBottom: '1px solid #e5e7eb',
}

const reviewCardLabel: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: '700',
  color: '#9ca3af',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.06em',
  margin: '0',
}

const reviewCardBody: React.CSSProperties = {
  padding: '14px 16px',
}

const reviewTitleText: React.CSSProperties = {
  fontSize: '15px',
  fontWeight: '700',
  color: '#111827',
  margin: '0 0 12px',
  lineHeight: '1.4',
}

const reviewMeta: React.CSSProperties = {
  fontSize: '13px',
  margin: '0',
  lineHeight: '1.5',
}

const metaLabel: React.CSSProperties = {
  color: '#9ca3af',
  fontSize: '11px',
  fontWeight: '600',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
}

const metaValue: React.CSSProperties = {
  color: '#111827',
  fontWeight: '600',
}

const approvedBadge: React.CSSProperties = {
  display: 'inline-block',
  backgroundColor: '#d1fae5',
  color: '#065f46',
  fontSize: '11px',
  fontWeight: '700',
  borderRadius: '100px',
  padding: '2px 10px',
}

// CTA
const ctaSection: React.CSSProperties = {
  textAlign: 'center' as const,
  marginBottom: '20px',
}

const primaryButton: React.CSSProperties = {
  backgroundColor: '#0f7b6c',
  color: '#ffffff',
  borderRadius: '10px',
  padding: '13px 24px',
  textDecoration: 'none',
  fontSize: '14px',
  fontWeight: '700',
  display: 'inline-block',
  letterSpacing: '-0.2px',
}

// Share section
const shareSection: React.CSSProperties = {
  backgroundColor: '#eff6ff',
  border: '1px solid #bfdbfe',
  borderRadius: '12px',
  padding: '16px',
  display: 'flex',
  gap: '12px',
  alignItems: 'flex-start',
  marginBottom: '24px',
}

const shareIcon: React.CSSProperties = {
  width: '32px',
  height: '32px',
  borderRadius: '8px',
  backgroundColor: '#3b82f6',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '700',
  textAlign: 'center' as const,
  lineHeight: '32px',
  display: 'inline-block',
  flexShrink: 0,
}

const shareTitle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: '700',
  color: '#1e3a8a',
  margin: '0 0 4px',
}

const shareDesc: React.CSSProperties = {
  fontSize: '12px',
  color: '#3b82f6',
  lineHeight: '1.55',
  margin: '0 0 10px',
}

const shareLinkBox: React.CSSProperties = {
  backgroundColor: '#ffffff',
  border: '1px solid #bfdbfe',
  borderRadius: '6px',
  padding: '7px 10px',
}

const shareLinkText: React.CSSProperties = {
  fontSize: '12px',
  color: '#2563eb',
  wordBreak: 'break-all' as const,
}

// Footer
const hr: React.CSSProperties = {
  borderColor: '#e5e7eb',
  borderTopWidth: '1px',
  margin: '24px 0',
}

const footer: React.CSSProperties = {
  fontSize: '12px',
  color: '#9ca3af',
  lineHeight: '1.6',
  textAlign: 'center' as const,
  margin: '0',
}

const footerLink: React.CSSProperties = {
  color: '#9ca3af',
  textDecoration: 'underline',
}
