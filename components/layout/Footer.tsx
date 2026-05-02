import Link from 'next/link'
import { Logo } from '@/components/Logo'
import { Chip } from '@/components/vett/Chip'

const FOOTER_COLS = [
  {
    title: 'Product',
    links: [
      { href: '/search', label: 'Search landlords' },
      { href: '/review/new', label: 'Write a review' },
      { href: '/compare', label: 'Compare landlords' },
      { href: '/add-landlord', label: 'Add a landlord' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { href: '/rights', label: 'Tenant rights guide' },
      { href: '/faq', label: 'FAQ' },
      { href: '/about', label: 'How verification works' },
      { href: '/contact', label: 'Report a data issue' },
    ],
  },
  {
    title: 'For landlords',
    links: [
      { href: '/landlord-portal/claim', label: 'Claim your profile' },
      { href: '/landlord-portal', label: 'Respond to reviews' },
      { href: '/dispute', label: 'Dispute a record' },
      { href: '/landlord-portal', label: 'Landlord portal' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '/about', label: 'About Vett' },
      { href: '/blog', label: 'Blog' },
      { href: '/contact', label: 'Contact' },
      { href: '/fcra-notice', label: 'FCRA notice' },
    ],
  },
]

export function Footer() {
  return (
    <footer className="border-t border-white/[0.08] bg-[#07111f] text-slate-400">
      <div className="mx-auto max-w-[1200px] px-4 pt-16 pb-10 sm:px-7">
        {/* Main grid */}
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 md:grid-cols-[1.2fr_repeat(4,1fr)]">
          {/* Brand */}
          <div className="sm:col-span-2 md:col-span-1">
            <Logo size="md" href="/" inverted />
            <p className="mt-5 max-w-[280px] text-[13px] leading-relaxed">
              Lease-verified renter reviews and public records on landlords in major cities and growing coverage nationwide.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Chip dark tone="neutral">Not a CRA — <Link href="/fcra-notice" className="underline hover:text-white">FCRA notice</Link></Chip>
            </div>
          </div>

          {/* Link columns */}
          {FOOTER_COLS.map(col => (
            <div key={col.title}>
              <h3 className="mb-4 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-300">
                {col.title}
              </h3>
              <ul className="grid gap-2.5">
                {col.links.map(link => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-[13px] text-slate-400 transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.08] pt-6 text-[12px] text-slate-600">
          <span>&copy; {new Date().getFullYear()} Vett, Inc. &middot; Know before you rent.</span>
          <div className="flex gap-5">
            <Link href="/privacy" className="hover:text-slate-400 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-slate-400 transition-colors">Terms</Link>
            <Link href="/fcra-notice" className="hover:text-slate-400 transition-colors">FCRA Notice</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
