import { Suspense } from 'react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { AuthErrorHandler } from '@/components/AuthErrorHandler'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Skip-to-content link — hidden until focused (keyboard-only),
          then jumps over the navbar to the main element. WCAG 2.4.1
          Bypass Blocks. Tab from a fresh page load to see it. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-lg focus:bg-navy-700 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2"
      >
        Skip to main content
      </a>
      <Suspense fallback={null}>
        <AuthErrorHandler />
      </Suspense>
      <Navbar />
      <main id="main-content" tabIndex={-1} className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}
