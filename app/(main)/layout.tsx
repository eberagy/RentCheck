import { Suspense } from 'react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { AuthErrorHandler } from '@/components/AuthErrorHandler'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Suspense fallback={null}>
        <AuthErrorHandler />
      </Suspense>
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}
