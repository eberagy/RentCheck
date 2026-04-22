import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { Instrument_Serif } from 'next/font/google'
import Script from 'next/script'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from 'sonner'
import { PostHogProvider } from '@/components/PostHogProvider'
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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://vettrentals.com'),
  title: {
    default: 'Vett — Know Before You Rent',
    template: '%s | Vett',
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

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://vettrentals.com'

const siteJsonLd = JSON.stringify({
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
