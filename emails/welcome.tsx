import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Row,
  Column,
  Heading,
  Text,
  Button,
  Hr,
  Link,
} from '@react-email/components'

interface WelcomeEmailProps {
  firstName?: string
}

export default function WelcomeEmail({ firstName }: WelcomeEmailProps) {
  const name = firstName ?? 'there'

  return (
    <Html>
      <Head />
      <Preview>Welcome to Vett — research your next landlord before you sign</Preview>
      <Body style={body}>
        <Container style={container}>
          {/* ── Hero header ── */}
          <Section style={hero}>
            <div style={logoLockup}>
              <div style={logoIcon}>V</div>
              <span style={logoText}>Vett</span>
            </div>
            <Heading as="h1" style={heroHeading}>
              Lease-verified reviews,<br />nationwide.
            </Heading>
            <Text style={heroSub}>
              The landlord review platform that puts renters first.
            </Text>
          </Section>

          {/* ── Welcome message ── */}
          <Section style={content}>
            <Heading as="h2" style={h2}>
              Welcome, {name}!
            </Heading>
            <Text style={text}>
              You&apos;ve joined a community of renters helping each other make smarter housing
              decisions. Before you sign your next lease, you can now search any landlord&apos;s
              review history, court records, and violation filings — all in one place.
            </Text>

            {/* ── 3 things to do first ── */}
            <div style={stepsContainer}>
              <Text style={stepsLabel}>3 things to do first</Text>

              <Row style={stepRow}>
                <Column style={stepNumber}>
                  <div style={stepBadge}>1</div>
                </Column>
                <Column style={stepBody}>
                  <Text style={stepTitle}>Search your next landlord</Text>
                  <Text style={stepDesc}>
                    Look up any landlord or address. See reviews, public records, and violation
                    history before you commit to a lease.
                  </Text>
                  <Link href="https://vettrentals.com/search" style={stepLink}>
                    Search landlords →
                  </Link>
                </Column>
              </Row>

              <div style={stepDivider} />

              <Row style={stepRow}>
                <Column style={stepNumber}>
                  <div style={stepBadge}>2</div>
                </Column>
                <Column style={stepBody}>
                  <Text style={stepTitle}>Write a review about a past landlord</Text>
                  <Text style={stepDesc}>
                    Upload your lease and share your experience. Every published review is manually verified before it goes live.
                  </Text>
                  <Link href="https://vettrentals.com/review/new" style={stepLink}>
                    Write a review →
                  </Link>
                </Column>
              </Row>

              <div style={stepDivider} />

              <Row style={stepRow}>
                <Column style={stepNumber}>
                  <div style={stepBadge}>3</div>
                </Column>
                <Column style={stepBody}>
                  <Text style={stepTitle}>Set up watchlist alerts</Text>
                  <Text style={stepDesc}>
                    Watching a specific landlord or property? Add it to your watchlist and get
                    notified when new reviews or violations are filed.
                  </Text>
                  <Link href="https://vettrentals.com/dashboard" style={stepLink}>
                    Go to dashboard →
                  </Link>
                </Column>
              </Row>
            </div>

            {/* ── CTA ── */}
            <Section style={ctaSection}>
              <Button style={ctaButton} href="https://vettrentals.com/search">
                Start Researching Your Next Landlord
              </Button>
            </Section>

            <Hr style={hr} />

              <Text style={footer}>
                You received this because you created a Vett account.
                <br />
              <Link href="https://vettrentals.com/unsubscribe" style={footerLink}>
                Unsubscribe
              </Link>{' '}
              ·{' '}
              <Link href="https://vettrentals.com/privacy" style={footerLink}>
                Privacy Policy
              </Link>{' '}
              ·{' '}
              <Link href="https://vettrentals.com" style={footerLink}>
                vettrentals.com
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

// Hero
const hero: React.CSSProperties = {
  background: 'linear-gradient(135deg, #0f2744 0%, #1a4276 100%)',
  padding: '36px 36px 32px',
  textAlign: 'center' as const,
}

const logoLockup: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '10px',
  marginBottom: '20px',
}

const logoIcon: React.CSSProperties = {
  width: '36px',
  height: '36px',
  borderRadius: '8px',
  backgroundColor: '#0f7b6c',
  color: '#ffffff',
  fontSize: '13px',
  fontWeight: '800',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  letterSpacing: '-0.5px',
}

const logoText: React.CSSProperties = {
  color: '#ffffff',
  fontSize: '20px',
  fontWeight: '700',
  letterSpacing: '-0.3px',
}

const heroHeading: React.CSSProperties = {
  color: '#ffffff',
  fontSize: '24px',
  fontWeight: '800',
  lineHeight: '1.25',
  margin: '0 0 10px',
  letterSpacing: '-0.5px',
}

const heroSub: React.CSSProperties = {
  color: '#94b4d4',
  fontSize: '14px',
  margin: '0',
}

// Content
const content: React.CSSProperties = {
  padding: '32px 36px',
}

const h2: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: '700',
  color: '#111827',
  margin: '0 0 12px',
}

const text: React.CSSProperties = {
  fontSize: '14px',
  color: '#4b5563',
  lineHeight: '1.65',
  margin: '0 0 20px',
}

// Steps
const stepsContainer: React.CSSProperties = {
  backgroundColor: '#f9fafb',
  borderRadius: '12px',
  padding: '20px 20px 4px',
  marginBottom: '24px',
  border: '1px solid #e5e7eb',
}

const stepsLabel: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: '700',
  color: '#9ca3af',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
  margin: '0 0 16px',
}

const stepRow: React.CSSProperties = {
  marginBottom: '16px',
}

const stepNumber: React.CSSProperties = {
  width: '32px',
  verticalAlign: 'top',
  paddingTop: '2px',
}

const stepBadge: React.CSSProperties = {
  width: '24px',
  height: '24px',
  borderRadius: '50%',
  backgroundColor: '#1a4276',
  color: '#ffffff',
  fontSize: '12px',
  fontWeight: '700',
  textAlign: 'center' as const,
  lineHeight: '24px',
  display: 'inline-block',
}

const stepBody: React.CSSProperties = {
  verticalAlign: 'top',
}

const stepTitle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: '700',
  color: '#111827',
  margin: '0 0 4px',
}

const stepDesc: React.CSSProperties = {
  fontSize: '13px',
  color: '#6b7280',
  lineHeight: '1.55',
  margin: '0 0 6px',
}

const stepLink: React.CSSProperties = {
  fontSize: '12px',
  color: '#0f7b6c',
  fontWeight: '600',
  textDecoration: 'none',
  display: 'inline-block',
  marginBottom: '0',
}

const stepDivider: React.CSSProperties = {
  borderTop: '1px solid #e5e7eb',
  margin: '0 0 16px',
}

// CTA
const ctaSection: React.CSSProperties = {
  textAlign: 'center' as const,
  marginBottom: '8px',
}

const ctaButton: React.CSSProperties = {
  backgroundColor: '#1a4276',
  color: '#ffffff',
  borderRadius: '10px',
  padding: '14px 28px',
  textDecoration: 'none',
  fontSize: '14px',
  fontWeight: '700',
  display: 'inline-block',
  letterSpacing: '-0.2px',
}

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
