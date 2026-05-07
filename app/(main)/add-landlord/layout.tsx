import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Add a landlord',
  description:
    'Submit a new landlord to Vett. Upload your lease as proof and we\'ll add the listing so other renters can review them.',
  alternates: { canonical: '/add-landlord' },
  openGraph: {
    title: 'Add a landlord — Vett',
    description: 'Submit a new landlord to Vett with lease verification.',
    type: 'website',
  },
}

export default function AddLandlordLayout({ children }: { children: ReactNode }) {
  return children
}
