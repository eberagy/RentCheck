import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Dispute a public record',
  description:
    'Dispute a violation, eviction, or other public record on Vett. We follow FCRA-style procedures and respond within 30 days.',
  alternates: { canonical: '/dispute' },
  // /dispute is contextual — it's typically reached from a record link
  // with ?record=... query, not as a standalone page. Indexable but not
  // promoted in OG cards.
  openGraph: {
    title: 'Dispute a public record — Vett',
    description: 'Submit a dispute for a public record on Vett.',
    type: 'website',
  },
}

export default function DisputeLayout({ children }: { children: ReactNode }) {
  return children
}
