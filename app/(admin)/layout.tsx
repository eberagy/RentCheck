import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminNav } from '@/components/layout/AdminNav'

export const metadata: Metadata = { title: 'Admin', robots: 'noindex' }

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirectTo=/admin')

  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type')
    .eq('id', user.id)
    .single()

  if (profile?.user_type !== 'admin') redirect('/')

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Skip-to-content for keyboard users — admin pages have a thick
          left nav, even more reason to skip past it. */}
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-lg focus:bg-navy-700 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2"
      >
        Skip to main content
      </a>
      <AdminNav />
      <main id="admin-main" tabIndex={-1} className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
