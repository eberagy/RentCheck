import Link from 'next/link'
import { Search, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-20">
      <div className="text-center max-w-md">
        <div className="font-display text-[clamp(5rem,12vw,8rem)] leading-none tracking-tight bg-gradient-to-br from-slate-200 to-slate-100 bg-clip-text text-transparent mb-4">
          404
        </div>
        <h1 className="font-display text-[clamp(1.75rem,3.5vw,2.25rem)] leading-[1.08] tracking-tight text-slate-900 mb-3">Page not found</h1>
        <p className="text-slate-500 mb-8 text-[15px] leading-relaxed">
          The landlord, property, or page you&apos;re looking for doesn&apos;t exist — or may have been removed.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Button asChild className="bg-teal-600 hover:bg-teal-700 text-white">
            <Link href="/search">
              <Search className="h-4 w-4 mr-2" aria-hidden="true" /> Search Landlords
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">
              <Home className="h-4 w-4 mr-2" aria-hidden="true" /> Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
