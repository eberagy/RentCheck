'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Menu, ChevronDown, User, LogOut, LayoutDashboard, Shield, Settings } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Sheet, SheetContent } from '@/components/ui/sheet'
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
  const isHome = pathname === '/'

  return (
    <header
      className={cn(
        'sticky top-0 z-50 backdrop-blur-xl transition-colors',
        isHome
          ? 'border-b border-white/10 bg-[#07111f]/72'
          : 'border-b border-slate-200/80 bg-white/90'
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Logo size="md" />

          {/* Desktop nav */}
          <nav
            className={cn(
              'hidden items-center gap-1 rounded-full px-2 py-1 shadow-sm md:flex',
              isHome
                ? 'border border-white/10 bg-white/5'
                : 'border border-slate-200 bg-white'
            )}
          >
            {NAV_LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'rounded-full px-3 py-2 text-sm font-medium transition-colors',
                  pathname.startsWith(link.href)
                    ? isHome
                      ? 'bg-white text-slate-950'
                      : 'bg-slate-950 text-white'
                    : isHome
                      ? 'text-slate-300 hover:bg-white/10 hover:text-white'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-navy-600'
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop auth */}
          <div className="hidden md:flex items-center gap-3">
            {loading ? (
              <div className="h-8 w-8 animate-pulse rounded-full bg-slate-200" />
            ) : user ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    'rounded-full',
                    isHome
                      ? 'border-white/15 bg-white/5 text-white hover:bg-white/10'
                      : 'border-navy-200 text-navy-700 hover:bg-navy-50'
                  )}
                  onClick={() => router.push('/review/new')}
                >
                  Write a Review
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className={cn(
                      'flex items-center gap-2 rounded-full px-1.5 py-1 pr-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-navy-500',
                      isHome
                        ? 'border border-white/10 bg-white/5 text-white'
                        : 'border border-slate-200 bg-white'
                    )}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={profile?.avatar_url ?? undefined} />
                      <AvatarFallback className="bg-navy-100 text-navy-700 text-xs font-semibold">
                        {(profile?.full_name ?? user.email ?? 'U')[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <ChevronDown className={cn('h-3 w-3', isHome ? 'text-slate-300' : 'text-gray-500')} />
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
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn('rounded-full', isHome ? 'text-white hover:bg-white/10 hover:text-white' : '')}
                  onClick={() => signInWithGoogle()}
                >
                  Sign In
                </Button>
                <Button
                  size="sm"
                  className={cn(
                    'rounded-full px-4',
                    isHome
                      ? 'bg-white text-slate-950 hover:bg-slate-100'
                      : 'bg-navy-600 text-white hover:bg-navy-700'
                  )}
                  onClick={() => signInWithGoogle()}
                >
                  Get Started
                </Button>
              </>
            )}
          </div>

          {/* Mobile menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <button
              type="button"
              aria-label="Open navigation menu"
              onClick={() => setMobileOpen(true)}
              className={cn(
                'rounded-full p-2 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-navy-500 md:hidden',
                isHome
                  ? 'border border-white/10 bg-white/5 text-white hover:bg-white/10'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              )}
            >
              <Menu className="h-5 w-5" />
            </button>
            <SheetContent side="right" className="w-80 border-l border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] pt-8">
              <div className="mb-6">
                <Logo size="sm" className="mb-4" />
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Know before you rent
                </p>
              </div>
              <nav className="flex flex-col gap-1">
                {NAV_LINKS.map(link => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'rounded-2xl px-3 py-2.5 text-sm font-medium',
                      pathname.startsWith(link.href)
                        ? 'bg-slate-950 text-white'
                        : 'text-slate-700 hover:bg-white'
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="my-3 border-t border-slate-200" />
                {user ? (
                  <>
                    <div className="truncate px-3 py-1 text-xs text-slate-500">{user.email}</div>
                    <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-white">
                      <LayoutDashboard className="h-4 w-4" /> My Dashboard
                    </Link>
                    <Link href="/review/new" onClick={() => setMobileOpen(false)} className="rounded-2xl px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-white">
                      Write a Review
                    </Link>
                    {profile?.user_type === 'admin' && (
                      <Link href="/admin" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-white">
                        <Settings className="h-4 w-4" /> Admin
                      </Link>
                    )}
                    <button onClick={() => { signOut(); setMobileOpen(false) }} className="flex items-center gap-2 rounded-2xl px-3 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50">
                      <LogOut className="h-4 w-4" /> Sign Out
                    </button>
                  </>
                ) : (
                  <Button className="mt-2 w-full rounded-2xl bg-navy-600 hover:bg-navy-700" onClick={() => { signInWithGoogle(); setMobileOpen(false) }}>
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
