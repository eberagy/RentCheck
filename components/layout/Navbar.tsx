'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Menu, ChevronDown, User, LogOut, LayoutDashboard, Shield, Settings } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

const NAV_LINKS = [
  { href: '/search', label: 'Search' },
  { href: '/add-landlord', label: 'Add Landlord' },
  { href: '/rights', label: 'Tenant Rights' },
  { href: '/about', label: 'About' },
]

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, profile, loading, signInWithGoogle, signOut } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Logo size="md" />

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'text-sm font-medium transition-colors hover:text-navy-500',
                  pathname.startsWith(link.href) ? 'text-navy-600' : 'text-gray-600'
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop auth */}
          <div className="hidden md:flex items-center gap-3">
            {loading ? (
              <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse" />
            ) : user ? (
              <>
                <Button variant="outline" size="sm" className="border-navy-200 text-navy-700 hover:bg-navy-50" onClick={() => router.push('/review/new')}>
                  Write a Review
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-navy-500">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={profile?.avatar_url ?? undefined} />
                      <AvatarFallback className="bg-navy-100 text-navy-700 text-xs font-semibold">
                        {(profile?.full_name ?? user.email ?? 'U')[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <ChevronDown className="h-3 w-3 text-gray-500" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <div className="px-3 py-2 text-xs text-gray-500 truncate">{user.email}</div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push('/dashboard')} className="flex items-center gap-2">
                      <LayoutDashboard className="h-4 w-4" /> My Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/dashboard/settings')} className="flex items-center gap-2">
                      <User className="h-4 w-4" /> Account Settings
                    </DropdownMenuItem>
                    {profile?.user_type === 'landlord' && (
                      <DropdownMenuItem onClick={() => router.push('/landlord-portal')} className="flex items-center gap-2">
                        <Shield className="h-4 w-4" /> Landlord Portal
                      </DropdownMenuItem>
                    )}
                    {profile?.user_type === 'admin' && (
                      <DropdownMenuItem onClick={() => router.push('/admin')} className="flex items-center gap-2">
                        <Settings className="h-4 w-4" /> Admin Panel
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={signOut} className="text-red-600 flex items-center gap-2">
                      <LogOut className="h-4 w-4" /> Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => signInWithGoogle()}>
                  Sign In
                </Button>
                <Button size="sm" className="bg-navy-500 hover:bg-navy-600 text-white" onClick={() => signInWithGoogle()}>
                  Get Started
                </Button>
              </>
            )}
          </div>

          {/* Mobile menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger className="md:hidden rounded-md p-1 text-gray-600 hover:bg-gray-100 transition-colors">
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="right" className="w-72 pt-8">
              <Logo size="sm" className="mb-6" />
              <nav className="flex flex-col gap-1">
                {NAV_LINKS.map(link => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'px-3 py-2 rounded-md text-sm font-medium',
                      pathname.startsWith(link.href)
                        ? 'bg-navy-50 text-navy-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="border-t my-3" />
                {user ? (
                  <>
                    <div className="px-3 py-1 text-xs text-gray-500 truncate">{user.email}</div>
                    <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                      <LayoutDashboard className="h-4 w-4" /> My Dashboard
                    </Link>
                    <Link href="/review/new" onClick={() => setMobileOpen(false)} className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                      Write a Review
                    </Link>
                    {profile?.user_type === 'admin' && (
                      <Link href="/admin" onClick={() => setMobileOpen(false)} className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                        <Settings className="h-4 w-4" /> Admin
                      </Link>
                    )}
                    <button onClick={() => { signOut(); setMobileOpen(false) }} className="px-3 py-2 rounded-md text-sm font-medium text-red-600 hover:bg-red-50 flex items-center gap-2 text-left">
                      <LogOut className="h-4 w-4" /> Sign Out
                    </button>
                  </>
                ) : (
                  <Button className="w-full bg-navy-500 hover:bg-navy-600" onClick={() => { signInWithGoogle(); setMobileOpen(false) }}>
                    Sign In with Google
                  </Button>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
