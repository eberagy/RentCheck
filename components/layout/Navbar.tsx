'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Menu, ChevronDown, User, LogOut, LayoutDashboard,
  Shield, Settings, X, PenLine, MapPin, Search,
  FileText, Info,
} from 'lucide-react'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

const NAV_LINKS = [
  { href: '/search',       label: 'Search',        Icon: Search },
  { href: '/add-landlord', label: 'Add Landlord',  Icon: PenLine },
  { href: '/rights',       label: 'Tenant Rights', Icon: FileText },
  { href: '/about',        label: 'About',         Icon: Info },
]

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, profile, loading, signOut } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  // Close drawer on route change
  useEffect(() => { setMobileOpen(false) }, [pathname])

  // Prevent body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
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
                      ? 'text-teal-700 bg-teal-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Desktop auth */}
            <div className="hidden md:flex items-center gap-2">
              {loading ? (
                <div className="h-8 w-8 rounded-full bg-gray-100 animate-pulse" />
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
                    <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-500 focus-visible:ring-offset-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={profile?.avatar_url ?? undefined} />
                        <AvatarFallback className="bg-navy-100 text-navy-700 text-xs font-semibold">
                          {(profile?.full_name ?? user.email ?? 'U')[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <ChevronDown className="h-3 w-3 text-gray-400" />
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
                  <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900" onClick={() => router.push('/login')}>
                    Sign In
                  </Button>
                  <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white font-medium" onClick={() => router.push('/login')}>
                    Get Started
                  </Button>
                </>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              type="button"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
              onClick={() => setMobileOpen(v => !v)}
              className="md:hidden rounded-lg p-2 text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition-colors"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer — custom implementation, no library dependency */}
      {/* Backdrop */}
      <div
        id="mobile-nav-backdrop"
        aria-hidden="true"
        onClick={() => setMobileOpen(false)}
        className={cn(
          'fixed inset-0 z-50 bg-black/30 backdrop-blur-sm md:hidden transition-opacity duration-200',
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
      />

      {/* Drawer panel */}
      <div
        id="mobile-nav"
        role="dialog"
        aria-label="Navigation menu"
        aria-modal="true"
        className={cn(
          'fixed top-0 right-0 z-50 h-full w-[300px] bg-white shadow-2xl md:hidden flex flex-col transition-transform duration-300 ease-in-out',
          mobileOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <Logo size="md" />
          <button
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex flex-col px-3 py-4 gap-0.5 flex-1" aria-label="Mobile navigation">
          {NAV_LINKS.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors',
                isActive(href)
                  ? 'bg-teal-50 text-teal-700'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <Icon className="h-4 w-4 opacity-60 flex-shrink-0" />
              {label}
            </Link>
          ))}

          <div className="border-t border-gray-100 my-3" />

          {user ? (
            <>
              <Link
                href="/review/new"
                className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors"
              >
                <PenLine className="h-4 w-4 flex-shrink-0" />
                Write a Review
              </Link>
              <Link
                href="/dashboard"
                className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <LayoutDashboard className="h-4 w-4 opacity-60 flex-shrink-0" />
                My Dashboard
              </Link>
              <Link
                href="/dashboard/settings"
                className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Settings className="h-4 w-4 opacity-60 flex-shrink-0" />
                Account Settings
              </Link>
              {profile?.user_type === 'admin' && (
                <Link
                  href="/admin"
                  className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Shield className="h-4 w-4 opacity-60 flex-shrink-0" />
                  Admin Panel
                </Link>
              )}
            </>
          ) : (
            <div className="px-1">
              <Button
                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-xl"
                onClick={() => { setMobileOpen(false); router.push('/login') }}
              >
                Sign In
              </Button>
              <p className="text-xs text-center text-gray-400 mt-2">Free for renters, always</p>
            </div>
          )}
        </nav>

        {/* Drawer footer */}
        {user && (
          <div className="px-4 py-4 border-t border-gray-100">
            <div className="flex items-center gap-2.5 mb-3">
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage src={profile?.avatar_url ?? undefined} />
                <AvatarFallback className="bg-navy-100 text-navy-700 text-xs font-semibold">
                  {(profile?.full_name ?? user.email ?? 'U')[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
            <button
              onClick={() => { signOut(); setMobileOpen(false) }}
              className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="h-4 w-4 flex-shrink-0" />
              Sign Out
            </button>
          </div>
        )}
      </div>
    </>
  )
}
