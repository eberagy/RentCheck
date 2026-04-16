import Link from 'next/link'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-6xl font-bold text-gray-100 mb-4">404</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Page not found</h1>
        <p className="text-gray-500 mb-8 text-sm">
          The landlord, property, or page you&apos;re looking for doesn&apos;t exist — or may have been removed.
        </p>
        <div className="flex gap-3 justify-center">
          <Button asChild className="bg-navy-500 hover:bg-navy-600 text-white">
            <Link href="/search">
              <Search className="h-4 w-4 mr-2" /> Search Landlords
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Home</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
