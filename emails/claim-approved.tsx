import {
  Html, Head, Preview, Body, Container, Section,
  Heading, Text, Button, Hr
} from '@react-email/components'

interface ClaimApprovedEmailProps {
  firstName?: string
  landlordName: string
  landlordSlug: string
}

export default function ClaimApprovedEmail({ firstName, landlordName, landlordSlug }: ClaimApprovedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your landlord profile claim has been approved!</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={logo}>RentCheck</Heading>
          </Section>
          <Section style={content}>
            <div style={iconWrap}>🎉</div>
            <Heading as="h2" style={h2}>Profile Claim Approved</Heading>
            <Text style={text}>
              Hi {firstName ?? 'there'}, your claim for <strong>{landlordName}</strong> has been approved. You can now:
            </Text>
            <Section style={featureList}>
              <Text style={feature}>💬 Respond to renter reviews publicly</Text>
              <Text style={feature}>✏️ Update your business name, contact info, and bio</Text>
              <Text style={feature}>📊 View your rating breakdown and trends</Text>
            </Section>
            <Button style={button} href="https://rentcheck.app/landlord-portal">
              Open Landlord Portal →
            </Button>
            <Hr style={hr} />
            <Text style={footer}>
              RentCheck · <a href="https://rentcheck.app/privacy" style={link}>Privacy</a>
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
const content = { padding: '32px', textAlign: 'center' as const }
const iconWrap = { fontSize: '40px', margin: '0 0 16px' }
const h2 = { fontSize: '20px', fontWeight: '700', color: '#111827', margin: '0 0 12px' }
const text = { fontSize: '14px', color: '#374151', lineHeight: '1.6', margin: '0 0 12px', textAlign: 'left' as const }
const featureList = { backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '16px 20px', margin: '16px 0', textAlign: 'left' as const }
const feature = { fontSize: '13px', color: '#374151', margin: '6px 0' }
const button = { backgroundColor: '#0F7B6C', color: '#ffffff', borderRadius: '8px', padding: '12px 24px', textDecoration: 'none', fontSize: '14px', fontWeight: '600', display: 'inline-block', margin: '8px 0' }
const hr = { borderColor: '#e5e7eb', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#9ca3af' }
const link = { color: '#6b7280' }
