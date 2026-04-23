import { Hr, Link, Text } from '@react-email/components'

// Shared CAN-SPAM compliant footer. Used by every transactional email template.
// Includes working unsubscribe link (token-signed for one-click opt-out when
// a recipient user ID is available), physical mailing address, and privacy link.
// Keep copy minimal — every email should include this; its job is legal
// compliance, not conversion.

const VETT_POSTAL_ADDRESS = 'Vett, Inc. · 1234 Market St · Philadelphia, PA 19107'

interface EmailFooterProps {
  note?: string
  /** Token-signed unsubscribe link (see lib/unsubscribe-token.ts#createUnsubscribeToken). If provided, renders a one-click opt-out URL. */
  unsubscribeToken?: string
}

export function EmailFooter({ note, unsubscribeToken }: EmailFooterProps) {
  const unsubscribeHref = unsubscribeToken
    ? `https://vettrentals.com/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`
    : 'https://vettrentals.com/unsubscribe'
  return (
    <>
      <Hr style={hr} />
      <Text style={line}>
        {note ?? 'You received this because you have an account on Vett.'}
      </Text>
      <Text style={line}>
        <Link href={unsubscribeHref} style={link}>
          {unsubscribeToken ? 'Unsubscribe' : 'Manage emails'}
        </Link>{' '}·{' '}
        <Link href="https://vettrentals.com/privacy" style={link}>
          Privacy
        </Link>{' '}·{' '}
        <Link href="https://vettrentals.com/terms" style={link}>
          Terms
        </Link>
      </Text>
      <Text style={addr}>{VETT_POSTAL_ADDRESS}</Text>
    </>
  )
}

const hr: React.CSSProperties = { borderColor: '#e5e7eb', borderTopWidth: '1px', margin: '24px 0 18px' }
const line: React.CSSProperties = { fontSize: '11px', color: '#9ca3af', lineHeight: '1.6', textAlign: 'center' as const, margin: '0 0 4px' }
const link: React.CSSProperties = { color: '#9ca3af', textDecoration: 'underline' }
const addr: React.CSSProperties = { fontSize: '10px', color: '#cbd5e1', lineHeight: '1.5', textAlign: 'center' as const, margin: '8px 0 0' }
