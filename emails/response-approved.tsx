import {
  Html, Head, Preview, Body, Container, Section,
  Heading, Text, Button, Hr
} from '@react-email/components'

interface ResponseApprovedEmailProps {
  firstName?: string
  landlordName: string
  landlordSlug: string
  reviewTitle?: string
}

export default function ResponseApprovedEmail({
  firstName,
  landlordName,
  landlordSlug,
  reviewTitle,
}: ResponseApprovedEmailProps) {
  const landlordUrl = `https://vettrentals.com/landlord/${landlordSlug}`

  return (
    <Html>
      <Head />
      <Preview>Your response is now live on Vett</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={logo}>Vett</Heading>
          </Section>
          <Section style={content}>
            <div style={iconWrap}>✅</div>
            <Heading as="h2" style={h2}>Your Response Is Live</Heading>
            <Text style={text}>
              Hi {firstName ?? 'there'}, your response on the review of <strong>{landlordName}</strong>
              {reviewTitle ? <> (<em>&ldquo;{reviewTitle}&rdquo;</em>)</> : null} has been approved and is now
              visible to renters on your profile.
            </Text>
            <Text style={text}>
              Thanks for engaging transparently — thoughtful responses help build trust with future renters.
            </Text>
            <Button style={button} href={landlordUrl}>
              View on Your Profile →
            </Button>
            <Hr style={hr} />
            <Text style={footer}>
              Vett · Know before you rent · <a href="https://vettrentals.com/privacy" style={link}>Privacy</a>
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
const button = { backgroundColor: '#0F7B6C', color: '#ffffff', borderRadius: '8px', padding: '12px 24px', textDecoration: 'none', fontSize: '14px', fontWeight: '600', display: 'inline-block', margin: '8px 0' }
const hr = { borderColor: '#e5e7eb', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#9ca3af' }
const link = { color: '#6b7280' }
