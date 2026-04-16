import {
  Html, Head, Preview, Body, Container, Section,
  Heading, Text, Button, Hr
} from '@react-email/components'

interface WatchlistAlertEmailProps {
  firstName?: string
  landlordName: string
  landlordSlug: string
  alertType: 'new_review' | 'new_violation' | 'new_court_case'
  summary: string
}

const ALERT_LABELS = {
  new_review: 'New Renter Review',
  new_violation: 'New Violation Filed',
  new_court_case: 'New Court Case Filed',
}

const ALERT_ICONS = {
  new_review: '⭐',
  new_violation: '⚠️',
  new_court_case: '⚖️',
}

export default function WatchlistAlertEmail({ firstName, landlordName, landlordSlug, alertType, summary }: WatchlistAlertEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{ALERT_ICONS[alertType]} {ALERT_LABELS[alertType]}: {landlordName}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={logo}>RentCheck</Heading>
          </Section>
          <Section style={content}>
            <Heading as="h2" style={h2}>Watchlist Alert</Heading>
            <Text style={text}>Hi {firstName ?? 'there'}, there&apos;s new activity on a landlord you&apos;re watching.</Text>
            <Section style={alertBox}>
              <Text style={alertTitle}>{ALERT_ICONS[alertType]} {ALERT_LABELS[alertType]}</Text>
              <Text style={alertLandlord}><strong>{landlordName}</strong></Text>
              <Text style={alertSummary}>{summary}</Text>
            </Section>
            <Button style={button} href={`https://rentcheck.app/landlord/${landlordSlug}`}>
              View Profile →
            </Button>
            <Hr style={hr} />
            <Text style={footer}>
              You&apos;re receiving this because you watch {landlordName} on RentCheck.{' '}
              <a href={`https://rentcheck.app/dashboard`} style={link}>Manage watchlist</a> ·{' '}
              <a href="https://rentcheck.app/privacy" style={link}>Privacy</a>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

const body = { backgroundColor: '#f9fafb', fontFamily: 'Inter, -apple-system, sans-serif' }
const container = { maxWidth: '560px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '12px', overflow: 'hidden' }
const header = { backgroundColor: '#1E3A5F', padding: '24px 32px' }
const logo = { color: '#ffffff', fontSize: '22px', fontWeight: '700', margin: '0' }
const content = { padding: '32px' }
const h2 = { fontSize: '20px', fontWeight: '700', color: '#111827', margin: '0 0 8px' }
const text = { fontSize: '14px', color: '#374151', lineHeight: '1.6', margin: '0 0 16px' }
const alertBox = { backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '16px 20px', margin: '0 0 20px' }
const alertTitle = { fontSize: '12px', fontWeight: '600', color: '#92400e', textTransform: 'uppercase' as const, letterSpacing: '0.05em', margin: '0 0 4px' }
const alertLandlord = { fontSize: '16px', fontWeight: '700', color: '#111827', margin: '0 0 4px' }
const alertSummary = { fontSize: '13px', color: '#374151', margin: '0' }
const button = { backgroundColor: '#1E3A5F', color: '#ffffff', borderRadius: '8px', padding: '12px 24px', textDecoration: 'none', fontSize: '14px', fontWeight: '600', display: 'inline-block', margin: '0 0 8px' }
const hr = { borderColor: '#e5e7eb', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#9ca3af', lineHeight: '1.6' }
const link = { color: '#6b7280' }
