import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import { jsonLdSafe } from '@/lib/json-ld'
import { Instrument_Serif } from 'next/font/google'
import Script from 'next/script'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from 'sonner'
import { PostHogProvider } from '@/components/PostHogProvider'
import { canonicalSiteUrl } from '@/lib/canonical-host'
import './globals.css'

const sans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-sans',
  display: 'swap',
})

const display = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-display',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(canonicalSiteUrl()),
  title: {
    // Homepage uses `default` as-is (no template suffix), so we don't double
    // the brand. Child pages get `| Vett` appended via the template.
    default: 'Vett — Know Before You Rent',
    template: '%s | Vett',
  },
  alternates: {
    canonical: '/',
  },
  description: 'Lease-verified renter reviews and public records on landlords nationwide. Know before you rent.',
  keywords: ['landlord reviews', 'renter reviews', 'landlord background check', 'housing violations', 'eviction records'],
  openGraph: {
    type: 'website',
    siteName: 'Vett',
    locale: 'en_US',
    title: 'Vett — Know Before You Rent',
    description: 'Lease-verified renter reviews and public records on landlords nationwide.',
  },
  twitter: {
    card: 'summary_large_image',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  },
}

// Viewport export controls the address-bar tint on mobile browsers and the
// scaling behavior of the meta viewport tag. The themeColor matches the
// hero `bg-ink` (#07111f) so iOS/Android Chrome show a navy bar instead of
// the default white that clashes with the dark hero on first paint.
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#07111f' },
    { media: '(prefers-color-scheme: dark)', color: '#07111f' },
  ],
  colorScheme: 'light',
  width: 'device-width',
  initialScale: 1,
}

const siteUrl = canonicalSiteUrl()

const siteJsonLd = jsonLdSafe({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${siteUrl}/#organization`,
      name: 'Vett',
      url: siteUrl,
      slogan: 'Know before you rent',
      description: 'Lease-verified renter reviews and public records on landlords nationwide.',
    },
    {
      '@type': 'WebSite',
      '@id': `${siteUrl}/#website`,
      url: siteUrl,
      name: 'Vett',
      publisher: { '@id': `${siteUrl}/#organization` },
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: `${siteUrl}/search?q={search_term_string}` },
        'query-input': 'required name=search_term_string',
      },
    },
  ],
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable}`}>
      <body className="font-sans bg-background text-foreground antialiased min-h-screen flex flex-col">
        <Script id="vett-site-jsonld" type="application/ld+json" strategy="beforeInteractive">
          {siteJsonLd}
        </Script>
        <TooltipProvider>
          <PostHogProvider>
            {children}
          </PostHogProvider>
          <Toaster position="top-right" richColors />
        </TooltipProvider>
      </body>
    </html>
  )
}
