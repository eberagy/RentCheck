import {
  Html, Head, Preview, Body, Container, Section,
  Heading, Text, Button,
} from '@react-email/components'
import { EmailFooter } from './_components/Footer'

interface ResponseRejectedEmailProps {
  firstName?: string
  landlordName: string
  reason?: string
}

export default function ResponseRejectedEmail({ firstName, landlordName, reason }: ResponseRejectedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Update on your response submission</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={logo}>Vett</Heading>
          </Section>
          <Section style={content}>
            <Heading as="h2" style={h2}>Your Response Was Not Published</Heading>
            <Text style={text}>
              Hi {firstName ?? 'there'}, the response you submitted on a review of <strong>{landlordName}</strong> did
              not meet our community guidelines and was not published.
            </Text>
            {reason && (
              <Section style={reasonBox}>
                <Text style={{ ...text, margin: 0 }}><strong>Note from the team:</strong> {reason}</Text>
              </Section>
            )}
            <Text style={text}>
              You&apos;re welcome to submit a new response that sticks to the facts of the rental and avoids
              personal attacks, private details, or unverifiable claims.
            </Text>
            <Button style={button} href="https://vettrentals.com/landlord-portal">
              Back to Landlord Portal →
            </Button>
            <EmailFooter note="You received this because you submitted a landlord response on Vett." />
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
const h2 = { fontSize: '20px', fontWeight: '700', color: '#111827', margin: '0 0 12px' }
const text = { fontSize: '14px', color: '#374151', lineHeight: '1.6', margin: '0 0 12px' }
const reasonBox = { backgroundColor: '#fef3c7', border: '1px solid #fde68a', borderRadius: '8px', padding: '12px 16px', margin: '12px 0' }
const button = { backgroundColor: '#1E3A5F', color: '#ffffff', borderRadius: '8px', padding: '12px 24px', textDecoration: 'none', fontSize: '14px', fontWeight: '600', display: 'inline-block', margin: '8px 0' }
const hr = { borderColor: '#e5e7eb', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#9ca3af' }
const link = { color: '#6b7280' }
