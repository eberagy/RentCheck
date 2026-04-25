import {
  Html, Head, Preview, Body, Container, Section,
  Heading, Text, Button,
} from '@react-email/components'
import { EmailFooter } from './_components/Footer'

interface ReviewRejectedEmailProps {
  firstName?: string
  reviewTitle: string
  reason?: string
}

export default function ReviewRejectedEmail({ firstName, reviewTitle, reason }: ReviewRejectedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Update on your Vett review submission</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={logo}>Vett</Heading>
          </Section>
          <Section style={content}>
            <Heading as="h2" style={h2}>Review Not Approved</Heading>
            <Text style={text}>
              Hi {firstName ?? 'there'}, unfortunately your review <strong>&ldquo;{reviewTitle}&rdquo;</strong> was not approved at this time.
            </Text>
            {reason && (
              <Section style={reasonBox}>
                <Text style={{ ...text, margin: 0 }}><strong>Reason:</strong> {reason}</Text>
              </Section>
            )}
            <Text style={text}>
              Common reasons include: content that violates our guidelines, inability to verify the rental, or content that does not meet our minimum standards. You&apos;re welcome to submit a revised review once you have a lease or other supporting documentation ready.
            </Text>
            <Button style={button} href="https://vettrentals.com/review/new">
              Submit a New Review
            </Button>
            <EmailFooter note="You received this because you submitted a review on Vett." />
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
