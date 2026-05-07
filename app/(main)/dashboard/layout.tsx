import type { Metadata } from 'next'
import type { ReactNode } from 'react'

// Dashboard is logged-in only — no SEO value, and we don't want
// crawlers indexing the redirect-to-login pages they'd hit. Page-
// level metadata (titles like "Dashboard", "Watchlist", etc.)
// merges on top of this; only the robots directive is shared.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return children
}
