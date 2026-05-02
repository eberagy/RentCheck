import {
  Html, Head, Preview, Body, Container, Section,
  Heading, Text, Button, Hr,
} from '@react-email/components'
import { EmailFooter } from './_components/Footer'

interface DigestLandlord {
  name: string
  slug: string
  rating: number | null
  reviewCount: number
}

interface SavedSearchDigestEmailProps {
  firstName?: string
  city: string
  stateAbbr: string
  /** Pre-built absolute URL to the city page (cron computes via cityPagePath). */
  cityUrl?: string
  newReviewCount: number
  newLandlords: DigestLandlord[]
  unsubscribeToken?: string
}

export default function SavedSearchDigestEmail({
  firstName,
  city,
  stateAbbr,
  cityUrl,
  newReviewCount,
  newLandlords,
  unsubscribeToken,
}: SavedSearchDigestEmailProps) {
  const fallbackUrl = `https://vettrentals.com/city/${stateAbbr.toLowerCase()}/${city.toLowerCase().replace(/\s+/g, '-')}`
  const href = cityUrl ?? fallbackUrl
  return (
    <Html>
      <Head />
      <Preview>{`This week in ${city}: ${newReviewCount} new review${newReviewCount === 1 ? '' : 's'}`}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={logo}>Vett</Heading>
          </Section>
          <Section style={content}>
            <Heading as="h2" style={h2}>This week in {city}, {stateAbbr}</Heading>
            <Text style={text}>
              Hi {firstName ?? 'there'} — here&apos;s what renters in {city} shared this week.
            </Text>

            <Section style={statBox}>
              <Text style={statNum}>{newReviewCount}</Text>
              <Text style={statLabel}>new approved review{newReviewCount === 1 ? '' : 's'}</Text>
            </Section>

            {newLandlords.length > 0 && (
              <>
                <Hr style={hr} />
                <Text style={sectionLabel}>Landlords with activity</Text>
                {newLandlords.slice(0, 8).map(l => (
                  <Section key={l.slug} style={landlordRow}>
                    <Text style={landlordName}>{l.name}</Text>
                    <Text style={landlordMeta}>
                      {l.rating != null ? `${l.rating.toFixed(1)} / 5` : 'No rating yet'} · {l.reviewCount} review{l.reviewCount === 1 ? '' : 's'}
                    </Text>
                  </Section>
                ))}
              </>
            )}

            <Button style={button} href={href}>
              See all {city} landlords →
            </Button>

            <EmailFooter
              note={`You're subscribed to weekly updates for ${city}, ${stateAbbr}.`}
              unsubscribeToken={unsubscribeToken}
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
const statBox = { backgroundColor: '#ecfeff', border: '1px solid #a5f3fc', borderRadius: '10px', padding: '20px', textAlign: 'center' as const, margin: '0 0 20px' }
const statNum = { fontSize: '36px', fontWeight: '800', color: '#0e7490', margin: '0', lineHeight: '1' }
const statLabel = { fontSize: '12px', fontWeight: '600', color: '#0e7490', textTransform: 'uppercase' as const, letterSpacing: '0.06em', margin: '6px 0 0' }
const hr = { borderColor: '#e5e7eb', margin: '20px 0' }
const sectionLabel = { fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.08em', margin: '0 0 12px' }
const landlordRow = { borderBottom: '1px solid #f1f5f9', padding: '8px 0', margin: '0' }
const landlordName = { fontSize: '14px', fontWeight: '600', color: '#0f172a', margin: '0 0 2px' }
const landlordMeta = { fontSize: '12px', color: '#64748b', margin: '0' }
const button = { backgroundColor: '#0f766e', color: '#ffffff', borderRadius: '8px', padding: '12px 24px', textDecoration: 'none', fontSize: '14px', fontWeight: '600', display: 'inline-block', margin: '20px 0 8px' }
