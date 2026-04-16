'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Menu, ChevronDown, User, LogOut, LayoutDashboard, Shield, Settings, X, PenLine, MapPin } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
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

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Logo size="md" />

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
            {NAV_LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive(link.href)
                    ? 'bg-navy-50 text-navy-700'
                    : 'text-gray-600 hover:text-navy-700 hover:bg-gray-50'
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop auth */}
          <div className="hidden md:flex items-center gap-2">
            {loading ? (
              <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse" />
            ) : user ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-teal-200 text-teal-700 hover:bg-teal-50 font-medium gap-1.5"
                  onClick={() => router.push('/review/new')}
                >
                  <PenLine className="h-3.5 w-3.5" />
                  Write a Review
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center gap-2 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-500 focus-visible:ring-offset-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={profile?.avatar_url ?? undefined} />
                      <AvatarFallback className="bg-navy-100 text-navy-700 text-xs font-semibold">
                        {(profile?.full_name ?? user.email ?? 'U')[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <ChevronDown className="h-3 w-3 text-gray-500" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <div className="px-3 py-2 text-xs text-gray-500 truncate">{user.email}</div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push('/dashboard')} className="flex items-center gap-2 cursor-pointer">
                      <LayoutDashboard className="h-4 w-4" /> My Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/dashboard/settings')} className="flex items-center gap-2 cursor-pointer">
                      <User className="h-4 w-4" /> Account Settings
                    </DropdownMenuItem>
                    {profile?.user_type === 'landlord' && (
                      <DropdownMenuItem onClick={() => router.push('/landlord-portal')} className="flex items-center gap-2 cursor-pointer">
                        <Shield className="h-4 w-4" /> Landlord Portal
                      </DropdownMenuItem>
                    )}
                    {profile?.user_type === 'admin' && (
                      <DropdownMenuItem onClick={() => router.push('/admin')} className="flex items-center gap-2 cursor-pointer">
                        <Settings className="h-4 w-4" /> Admin Panel
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={signOut} className="text-red-600 flex items-center gap-2 cursor-pointer focus:text-red-600 focus:bg-red-50">
                      <LogOut className="h-4 w-4" /> Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" className="text-gray-700 hover:text-navy-700" onClick={() => signInWithGoogle()}>
                  Sign In
                </Button>
                <Button size="sm" className="bg-navy-600 hover:bg-navy-700 text-white font-medium" onClick={() => signInWithGoogle()}>
                  Get Started
                </Button>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            aria-label="Open navigation menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(true)}
            className="md:hidden rounded-lg p-2 text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="right" className="w-[300px] sm:w-[320px] p-0 flex flex-col">
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <Logo size="md" />
            <button
              onClick={() => setMobileOpen(false)}
              className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Nav links */}
          <nav className="flex flex-col px-3 py-3 gap-0.5" aria-label="Mobile navigation">
            {NAV_LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive(link.href)
                    ? 'bg-navy-50 text-navy-700'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-navy-700'
                )}
              >
                {link.label === 'Search' && <MapPin className="h-4 w-4 opacity-60" />}
                {link.label === 'Tenant Rights' && <Shield className="h-4 w-4 opacity-60" />}
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Divider + Auth */}
          <div className="px-3 py-3 border-t border-gray-100 mt-auto">
            {user ? (
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2.5 px-3 py-2 mb-1">
                  <Avatar className="h-7 w-7 flex-shrink-0">
                    <AvatarImage src={profile?.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-navy-100 text-navy-700 text-xs font-semibold">
                      {(profile?.full_name ?? user.email ?? 'U')[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                </div>
                <Link href="/review/new" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors">
                  <PenLine className="h-4 w-4" /> Write a Review
                </Link>
                <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                  <LayoutDashboard className="h-4 w-4 opacity-60" /> My Dashboard
                </Link>
                {profile?.user_type === 'admin' && (
                  <Link href="/admin" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                    <Settings className="h-4 w-4 opacity-60" /> Admin Panel
                  </Link>
                )}
                <button
                  onClick={() => { signOut(); setMobileOpen(false) }}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors text-left w-full"
                >
                  <LogOut className="h-4 w-4" /> Sign Out
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 px-1">
                <Button
                  className="w-full bg-navy-600 hover:bg-navy-700 text-white font-medium"
                  onClick={() => { signInWithGoogle(); setMobileOpen(false) }}
                >
                  Sign In with Google
                </Button>
                <p className="text-xs text-center text-gray-400">Free for renters, always</p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </header>
  )
}
