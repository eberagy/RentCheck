import Link from 'next/link'
import type { Metadata } from 'next'
import { LayoutDashboard } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Admin route not found · Vett',
  robots: { index: false, follow: false },
}

// not-found.tsx for the (admin) route group. Without this, an admin who
// hits a wrong subpath (e.g. /admin/typo) bubbles to the public-facing
// (main)/not-found which suggests city pages — the wrong recovery for
// an admin who's just trying to find the right tool.
export default function AdminNotFound() {
  return (
    <div className="p-4 sm:p-8">
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <h1 className="font-display text-2xl font-semibold text-slate-900 mb-2">Admin route not found</h1>
        <p className="text-sm text-slate-500 mb-6">
          The admin path you tried doesn&apos;t exist. Head back to the dashboard and pick a queue from there.
        </p>
        <Button asChild className="bg-slate-900 text-white hover:bg-slate-800">
          <Link href="/admin">
            <LayoutDashboard className="h-4 w-4 mr-2" aria-hidden="true" />
            Admin dashboard
          </Link>
        </Button>
      </div>
    </div>
  )
}
