'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Menu, ChevronDown, User, LogOut, LayoutDashboard, Shield, Settings, ArrowRight } from 'lucide-react'
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
  { href: '/rights', label: 'Rights' },
  { href: '/landlord-portal', label: 'For landlords' },
  { href: '/about', label: 'About' },
]

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, profile, loading, signOut } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const isHome = pathname === '/'
  const isDark = isHome

  return (
    <header
      className={cn(
        'sticky top-0 z-50 transition-colors',
        isDark
          ? 'border-b border-white/[0.08] bg-transparent'
          : 'border-b border-slate-200 bg-white/85 backdrop-blur-xl'
      )}
    >
      <div className="mx-auto grid max-w-[1200px] grid-cols-[auto_1fr_auto] items-center gap-6 px-7 py-[18px]">
        {/* Logo */}
        <Logo size="md" inverted={isDark} />

        {/* Desktop nav */}
        <nav className="hidden items-center justify-center gap-7 md:flex">
          {NAV_LINKS.map(link => {
            const active = pathname.startsWith(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'pb-1 text-[13.5px] font-medium transition-colors border-b-2',
                  active
                    ? isDark
                      ? 'border-teal-300 text-white'
                      : 'border-teal-500 text-slate-900'
                    : isDark
                      ? 'border-transparent text-slate-400 hover:text-white'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                )}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>

        {/* Desktop auth */}
        <div className="hidden items-center gap-2.5 md:flex">
          {loading ? (
            <div className="h-8 w-8 animate-pulse rounded-full bg-slate-200" />
          ) : user ? (
            <>
              <Button
                size="sm"
                className={cn(
                  'h-9 rounded-full px-4 text-[13px] font-semibold',
                  isDark
                    ? 'bg-white text-slate-900 shadow-lg shadow-white/10 hover:bg-slate-100'
                    : 'bg-slate-900 text-white hover:bg-slate-800'
                )}
                onClick={() => router.push('/review/new')}
              >
                Write a review <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger
                  className={cn(
                    'flex items-center gap-2 rounded-full px-1.5 py-1 pr-3 focus:outline-none focus:ring-2 focus:ring-teal-500',
                    isDark
                      ? 'border border-white/10 bg-white/5 text-white'
                      : 'border border-slate-200 bg-white shadow-sm'
                  )}
                >
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={profile?.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-navy-100 text-navy-700 text-xs font-semibold">
                      {(profile?.full_name ?? user.email ?? 'U')[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className={cn('h-3 w-3', isDark ? 'text-slate-400' : 'text-slate-500')} />
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
              <button
                onClick={() => router.push('/login')}
                className={cn(
                  'text-[13.5px] font-medium transition-colors',
                  isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-700'
                )}
              >
                Sign in
              </button>
              <Button
                size="sm"
                className={cn(
                  'h-9 rounded-full px-4 text-[13px] font-semibold',
                  isDark
                    ? 'bg-white text-slate-900 shadow-lg shadow-white/10 hover:bg-slate-100'
                    : 'bg-slate-900 text-white hover:bg-slate-800'
                )}
                onClick={() => router.push('/review/new')}
              >
                Write a review <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
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
              'rounded-full border p-2 transition-colors md:hidden',
              isDark
                ? 'border-white/10 bg-white/5 text-white'
                : 'border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50'
            )}
          >
            <Menu className="h-5 w-5" />
          </button>
          <SheetContent side="right" className="w-80 border-l border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] pt-8">
            <div className="mb-6">
              <Logo size="sm" className="mb-4" />
              <p className="text-[10.5px] font-bold uppercase tracking-[0.22em] text-slate-400">
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
                <Button className="mt-2 w-full rounded-2xl bg-navy-600 hover:bg-navy-700" onClick={() => { router.push('/login'); setMobileOpen(false) }}>
                  Sign In
                </Button>
              )}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
