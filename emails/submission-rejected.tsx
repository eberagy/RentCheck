import {
  Html, Head, Preview, Body, Container, Section,
  Heading, Text, Button,
} from '@react-email/components'
import { EmailFooter } from './_components/Footer'

interface SubmissionRejectedEmailProps {
  firstName?: string
  landlordName: string
  reason?: string
  isDuplicate?: boolean
}

export default function SubmissionRejectedEmail({
  firstName,
  landlordName,
  reason,
  isDuplicate,
}: SubmissionRejectedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Update on your landlord submission</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={logo}>Vett</Heading>
          </Section>
          <Section style={content}>
            <Heading as="h2" style={h2}>
              {isDuplicate ? 'This Landlord Is Already On Vett' : 'Submission Not Approved'}
            </Heading>
            <Text style={text}>
              Hi {firstName ?? 'there'}, thanks for submitting <strong>{landlordName}</strong> to Vett.
              {isDuplicate
                ? ' We found that this landlord already exists in our database, so we didn’t create a duplicate listing.'
                : ' Unfortunately we weren’t able to add this submission to our database at this time.'}
            </Text>
            {reason && (
              <Section style={reasonBox}>
                <Text style={{ ...text, margin: 0 }}><strong>Note from the team:</strong> {reason}</Text>
              </Section>
            )}
            <Text style={text}>
              {isDuplicate
                ? 'Search Vett for the landlord — you can leave a review directly on their existing profile.'
                : 'Common reasons include insufficient info to identify the landlord, a name that matches a person rather than a rental business, or a listing outside the areas we currently cover.'}
            </Text>
            <Button style={button} href={isDuplicate ? 'https://vettrentals.com/search' : 'https://vettrentals.com/submit'}>
              {isDuplicate ? 'Search Vett →' : 'Submit Again →'}
            </Button>
            <EmailFooter note="You received this because you submitted a landlord to Vett." />
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
