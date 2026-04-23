import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Heading,
  Text,
  Button,
  Hr,
  Link,
} from '@react-email/components'

export interface AdminDigestCounts {
  pendingReviews: number
  pendingLeases: number
  pendingClaims: number
  pendingSubmissions: number
  pendingResponses: number
  openFlags: number
  openDisputes: number
}

interface AdminDigestEmailProps {
  counts: AdminDigestCounts
}

const LINKS: { key: keyof AdminDigestCounts; label: string; href: string }[] = [
  { key: 'pendingReviews',     label: 'Reviews awaiting moderation',  href: 'https://vettrentals.com/admin/reviews' },
  { key: 'pendingLeases',      label: 'Leases awaiting verification', href: 'https://vettrentals.com/admin/leases' },
  { key: 'pendingClaims',      label: 'Landlord claims to review',    href: 'https://vettrentals.com/admin/claims' },
  { key: 'pendingSubmissions', label: 'Landlord submissions pending', href: 'https://vettrentals.com/admin/submissions' },
  { key: 'pendingResponses',   label: 'Landlord responses to review', href: 'https://vettrentals.com/admin/responses' },
  { key: 'openFlags',          label: 'Open review flags',            href: 'https://vettrentals.com/admin/flags' },
  { key: 'openDisputes',       label: 'Open record disputes',         href: 'https://vettrentals.com/admin/disputes' },
]

export default function AdminDigestEmail({ counts }: AdminDigestEmailProps) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  return (
    <Html>
      <Head />
      <Preview>{total === 0 ? 'All caught up — no pending items' : `${total} items need attention on Vett`}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <div style={logoLockup}>
              <div style={logoIcon}>V</div>
              <span style={logoText}>Vett Admin</span>
            </div>
          </Section>

          <Section style={content}>
            <Heading as="h1" style={h1}>
              {total === 0 ? 'All caught up.' : `${total} ${total === 1 ? 'item' : 'items'} awaiting action`}
            </Heading>
            <Text style={sub}>Daily moderation digest.</Text>

            {total === 0 ? (
              <div style={allClear}>
                <Text style={allClearText}>Every queue is empty. Nothing to do today.</Text>
              </div>
            ) : (
              <div style={list}>
                {LINKS.filter(l => counts[l.key] > 0).map(l => (
                  <Link key={l.key} href={l.href} style={row}>
                    <span style={rowLabel}>{l.label}</span>
                    <span style={rowCount}>{counts[l.key]}</span>
                  </Link>
                ))}
              </div>
            )}

            <Section style={ctaSection}>
              <Button style={primaryButton} href="https://vettrentals.com/admin">
                Open admin dashboard
              </Button>
            </Section>

            <Hr style={hr} />
            <Text style={footer}>You received this because you are an admin on Vett.</Text>
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
const h1: React.CSSProperties = { fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.3px' }
const sub: React.CSSProperties = { fontSize: '13px', color: '#64748b', margin: '0 0 22px' }
const list: React.CSSProperties = { border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden', marginBottom: '22px' }
const row: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #f1f5f9', textDecoration: 'none', color: '#0f172a' }
const rowLabel: React.CSSProperties = { fontSize: '14px', color: '#334155' }
const rowCount: React.CSSProperties = { fontSize: '14px', fontWeight: '800', color: '#0f7b6c', background: '#ecfdf5', padding: '2px 10px', borderRadius: '100px' }
const allClear: React.CSSProperties = { backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '16px', marginBottom: '22px' }
const allClearText: React.CSSProperties = { fontSize: '14px', color: '#065f46', margin: 0, textAlign: 'center' as const }
const ctaSection: React.CSSProperties = { textAlign: 'center' as const, marginBottom: '16px' }
const primaryButton: React.CSSProperties = { backgroundColor: '#0f7b6c', color: '#ffffff', borderRadius: '10px', padding: '13px 24px', textDecoration: 'none', fontSize: '14px', fontWeight: '700', display: 'inline-block' }
const hr: React.CSSProperties = { borderColor: '#e5e7eb', borderTopWidth: '1px', margin: '20px 0' }
const footer: React.CSSProperties = { fontSize: '11px', color: '#9ca3af', lineHeight: '1.5', textAlign: 'center' as const, margin: 0 }
