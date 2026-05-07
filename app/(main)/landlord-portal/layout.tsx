import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Landlord portal',
  description:
    'Respond to reviews, claim your listing, and manage how your properties appear on Vett.',
  alternates: { canonical: '/landlord-portal' },
  openGraph: {
    title: 'Landlord portal — Vett',
    description: 'Respond to reviews and manage your listing on Vett.',
    type: 'website',
  },
  // Don't index the portal — it's a logged-in dashboard, not a marketing
  // landing page. Public claim entry already has its own canonical paths.
  robots: { index: false, follow: false },
}

export default function LandlordPortalLayout({ children }: { children: ReactNode }) {
  return children
}
