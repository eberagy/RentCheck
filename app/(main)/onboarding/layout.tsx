import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Welcome to Vett',
  // Post-signup flow — short-lived URL, no SEO value, and the page
  // assumes a fresh-signup session. Don't index.
  robots: { index: false, follow: false },
}

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return children
}
