import {
  Html, Head, Preview, Body, Container, Section,
  Heading, Text, Button, Hr
} from '@react-email/components'

interface SubmissionApprovedEmailProps {
  firstName?: string
  landlordName: string
  landlordSlug: string
}

export default function SubmissionApprovedEmail({ firstName, landlordName, landlordSlug }: SubmissionApprovedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{landlordName} has been added to Vett — you can now write your review!</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={logo}>Vett</Heading>
          </Section>
          <Section style={content}>
            <div style={iconWrap}>✅</div>
            <Heading as="h2" style={h2}>Landlord Added!</Heading>
            <Text style={text}>
              Hi {firstName ?? 'there'}, great news — <strong>{landlordName}</strong> has been reviewed and added to the Vett database.
            </Text>
            <Text style={text}>
              You can now write a review to help other renters know what to expect.
            </Text>
            <Button style={button} href={`https://vettrentals.com/review/new`}>
              Write Your Review →
            </Button>
            <Text style={secondaryText}>
              Or <a href={`https://vettrentals.com/landlord/${landlordSlug}`} style={link}>view the landlord profile</a>.
            </Text>
            <Hr style={hr} />
            <Text style={footer}>
              Vett · <a href="https://vettrentals.com/privacy" style={footerLink}>Privacy</a>
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
const secondaryText = { fontSize: '13px', color: '#6b7280', margin: '12px 0 0', textAlign: 'center' as const }
const button = { backgroundColor: '#0F7B6C', color: '#ffffff', borderRadius: '8px', padding: '12px 24px', textDecoration: 'none', fontSize: '14px', fontWeight: '600', display: 'inline-block', margin: '8px 0' }
const hr = { borderColor: '#e5e7eb', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#9ca3af' }
const link = { color: '#0F7B6C', textDecoration: 'underline' }
const footerLink = { color: '#6b7280' }
