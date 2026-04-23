import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Heading,
  Text,
  Hr,
  Link,
} from '@react-email/components'

export type DisputeDecision = 'record_removed' | 'record_updated' | 'no_action' | 'refer_to_source'

interface DisputeResolvedEmailProps {
  firstName?: string
  decision: DisputeDecision
  recordLabel?: string
  adminNotes?: string
}

const COPY: Record<DisputeDecision, { heading: string; body: (label?: string) => string }> = {
  record_removed: {
    heading: 'Record removed.',
    body: (label) => `After review, we agreed with your dispute${label ? ` about ${label}` : ''}. The record has been removed from Vett.`,
  },
  record_updated: {
    heading: 'Record updated.',
    body: (label) => `We reviewed your dispute${label ? ` about ${label}` : ''} and updated the record to reflect the corrected information.`,
  },
  no_action: {
    heading: 'Dispute reviewed — no changes.',
    body: (label) => `We reviewed your dispute${label ? ` about ${label}` : ''} and the record matches the source. We won't be making changes at this time.`,
  },
  refer_to_source: {
    heading: 'Please contact the source agency.',
    body: (label) => `The record${label ? ` (${label})` : ''} comes directly from a government database. We can't modify the underlying data — you'll need to contact the source agency to request a correction there. Once the source updates, our next sync will pick up the change.`,
  },
}

export default function DisputeResolvedEmail({ firstName, decision, recordLabel, adminNotes }: DisputeResolvedEmailProps) {
  const copy = COPY[decision]
  return (
    <Html>
      <Head />
      <Preview>{copy.heading}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <div style={logoLockup}>
              <div style={logoIcon}>V</div>
              <span style={logoText}>Vett</span>
            </div>
          </Section>

          <Section style={content}>
            <Heading as="h1" style={h1}>{copy.heading}</Heading>
            <Text style={greet}>Hi {firstName ?? 'there'},</Text>
            <Text style={bodyText}>{copy.body(recordLabel)}</Text>

            {adminNotes && (
              <div style={notesBox}>
                <Text style={notesLabel}>Admin notes</Text>
                <Text style={notesBody}>{adminNotes}</Text>
              </div>
            )}

            <Section style={ctaSection}>
              <Link href="https://vettrentals.com/dashboard" style={primaryButton}>
                View your dashboard
              </Link>
            </Section>

            <Hr style={hr} />
            <Text style={footer}>
              You received this because you submitted a record dispute on Vett.
              <br />
              <Link href="https://vettrentals.com/unsubscribe" style={footerLink}>Manage emails</Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

const body: React.CSSProperties = { backgroundColor: '#f3f4f6', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', margin: 0, padding: '24px 0' }
const container: React.CSSProperties = { maxWidth: '560px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }
const header: React.CSSProperties = { backgroundColor: '#0f2744', padding: '20px 32px' }
const logoLockup: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: '10px' }
const logoIcon: React.CSSProperties = { width: '32px', height: '32px', borderRadius: '7px', backgroundColor: '#0f7b6c', color: '#ffffff', fontSize: '12px', fontWeight: '800', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }
const logoText: React.CSSProperties = { color: '#ffffff', fontSize: '18px', fontWeight: '700' }
const content: React.CSSProperties = { padding: '28px 36px 32px' }
const h1: React.CSSProperties = { fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: '0 0 14px', letterSpacing: '-0.4px', lineHeight: '1.2' }
const greet: React.CSSProperties = { fontSize: '15px', fontWeight: '600', color: '#111827', margin: '0 0 8px' }
const bodyText: React.CSSProperties = { fontSize: '14px', color: '#4b5563', lineHeight: '1.65', margin: '0 0 16px' }
const notesBox: React.CSSProperties = { backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', marginBottom: '22px' }
const notesLabel: React.CSSProperties = { fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.06em', margin: '0 0 4px' }
const notesBody: React.CSSProperties = { fontSize: '13px', color: '#334155', lineHeight: '1.55', margin: 0 }
const ctaSection: React.CSSProperties = { textAlign: 'center' as const, marginBottom: '16px' }
const primaryButton: React.CSSProperties = { backgroundColor: '#0f7b6c', color: '#ffffff', borderRadius: '10px', padding: '13px 24px', textDecoration: 'none', fontSize: '14px', fontWeight: '700', display: 'inline-block' }
const hr: React.CSSProperties = { borderColor: '#e5e7eb', borderTopWidth: '1px', margin: '24px 0 18px' }
const footer: React.CSSProperties = { fontSize: '11px', color: '#9ca3af', lineHeight: '1.6', textAlign: 'center' as const, margin: 0 }
const footerLink: React.CSSProperties = { color: '#9ca3af', textDecoration: 'underline' }
