import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { Suspense } from 'react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from 'sonner'
import { PostHogProvider } from '@/components/PostHogProvider'
import './globals.css'

const sans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-sans',
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={sans.variable}>
      <body className="font-sans bg-background text-foreground antialiased min-h-screen flex flex-col">
        <TooltipProvider>
          <Suspense fallback={null}>
            <PostHogProvider>
              {children}
            </PostHogProvider>
          </Suspense>
          <Toaster position="top-right" richColors />
        </TooltipProvider>
      </body>
    </html>
  )
}
