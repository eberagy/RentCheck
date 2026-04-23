'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, FileText, AlertTriangle, Users,
  RefreshCw, Flag, ShieldCheck, Home, PlusSquare, MessageSquare, TriangleAlert, ScrollText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/Logo'

const ADMIN_LINKS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/reviews', label: 'Review Queue', icon: FileText },
  { href: '/admin/leases', label: 'Lease Verification', icon: ShieldCheck },
  { href: '/admin/claims', label: 'Landlord Claims', icon: Flag },
  { href: '/admin/responses', label: 'Responses', icon: MessageSquare },
  { href: '/admin/flags', label: 'Flagged Reviews', icon: TriangleAlert },
  { href: '/admin/disputes', label: 'Disputes', icon: AlertTriangle },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/submissions', label: 'Submissions', icon: PlusSquare },
  { href: '/admin/data-sync', label: 'Data Sync', icon: RefreshCw },
  { href: '/admin/audit', label: 'Audit Log', icon: ScrollText },
]

export function AdminNav() {
  const pathname = usePathname()

  return (
    <aside className="w-56 min-h-screen bg-navy-900 text-white flex flex-col">
      <div className="p-4 border-b border-navy-700">
        <Logo size="sm" href="/admin" />
        <span className="text-xs text-navy-300 mt-1 block">Admin Panel</span>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {ADMIN_LINKS.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-navy-600 text-white'
                  : 'text-navy-300 hover:bg-navy-800 hover:text-white'
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>
      <div className="p-3 border-t border-navy-700">
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-navy-400 hover:text-white hover:bg-navy-800 transition-colors"
        >
          <Home className="h-4 w-4" /> Back to Site
        </Link>
      </div>
    </aside>
  )
}
