import {
  Html, Head, Preview, Body, Container, Section,
  Heading, Text, Button,
} from '@react-email/components'
import { EmailFooter } from './_components/Footer'

interface CityAlertConfirmationEmailProps {
  city: string
  stateAbbr: string
}

export default function CityAlertConfirmationEmail({ city, stateAbbr }: CityAlertConfirmationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{`You're on the list for ${city}, ${stateAbbr}`}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={logo}>Vett</Heading>
          </Section>
          <Section style={content}>
            <Heading as="h2" style={h2}>You&apos;re on the list.</Heading>
            <Text style={text}>
              We&apos;ll email you when new lease-verified renter reviews land for{' '}
              <strong style={strong}>{city}, {stateAbbr}</strong>.
            </Text>

            <Section style={infoBox}>
              <Text style={infoTitle}>While you wait</Text>
              <Text style={infoBody}>
                Vett combines lease-verified reviews with public housing-violation,
                eviction, and code-enforcement records. Browse what we already have
                for {city} or check a specific landlord by name.
              </Text>
            </Section>

            <Button
              style={button}
              href={`https://vettrentals.com/city/${stateAbbr.toLowerCase()}/${city.toLowerCase().replace(/\s+/g, '-')}`}
            >
              See {city} on Vett →
            </Button>

            <Text style={smallNote}>
              Want a richer alert flow? Create a free account to follow specific
              landlords and get a weekly digest of new reviews:&nbsp;
              <a href="https://vettrentals.com/login?mode=signup" style={inlineLink}>Sign up</a>.
            </Text>

            <EmailFooter
              note={`We sent this because you signed up for ${city} alerts at vettrentals.com. We won't share your email.`}
            />
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
const h2 = { fontSize: '22px', fontWeight: '700', color: '#111827', margin: '0 0 8px' }
const text = { fontSize: '14px', color: '#374151', lineHeight: '1.6', margin: '0 0 20px' }
const strong = { color: '#0f7b6c' }
const infoBox = { backgroundColor: '#ecfeff', border: '1px solid #a5f3fc', borderRadius: '10px', padding: '16px 20px', margin: '0 0 20px' }
const infoTitle = { fontSize: '12px', fontWeight: '600', color: '#0e7490', textTransform: 'uppercase' as const, letterSpacing: '0.06em', margin: '0 0 6px' }
const infoBody = { fontSize: '13px', color: '#155e75', lineHeight: '1.55', margin: '0' }
const button = { backgroundColor: '#0f766e', color: '#ffffff', borderRadius: '8px', padding: '12px 24px', textDecoration: 'none', fontSize: '14px', fontWeight: '600', display: 'inline-block', margin: '0 0 20px' }
const smallNote = { fontSize: '12px', color: '#6b7280', lineHeight: '1.55', margin: '0' }
const inlineLink = { color: '#0f766e', textDecoration: 'underline' }
