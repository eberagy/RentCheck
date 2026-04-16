import Link from 'next/link'
import { Logo } from '@/components/Logo'
import { Shield, Mail } from 'lucide-react'

const FOOTER_LINKS = {
  Platform: [
    { href: '/search', label: 'Search Landlords' },
    { href: '/review/new', label: 'Write a Review' },
    { href: '/rights', label: 'Tenant Rights' },
    { href: '/landlord-portal', label: 'Landlord Portal' },
  ],
  Company: [
    { href: '/about', label: 'About' },
    { href: '/faq', label: 'FAQ' },
    { href: '/contact', label: 'Contact' },
  ],
  Legal: [
    { href: '/terms', label: 'Terms of Service' },
    { href: '/privacy', label: 'Privacy Policy' },
    { href: '/fcra-notice', label: 'FCRA Notice' },
  ],
}

export function Footer() {
  return (
    <footer className="bg-navy-900 text-gray-300 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <Logo size="lg" href="/" className="mb-4" />
            <p className="text-sm text-gray-400 mt-3 max-w-xs leading-relaxed">
              Lease-verified renter reviews and public records on landlords nationwide.
              Know before you rent.
            </p>
            <div className="flex items-center gap-2 mt-4 text-xs text-gray-500">
              <Shield className="h-3 w-3" />
              <span>Section 230 protected. Not a consumer reporting agency.</span>
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([category, links]) => (
            <div key={category}>
              <h3 className="text-white text-sm font-semibold mb-3">{category}</h3>
              <ul className="space-y-2">
                {links.map(link => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-400 hover:text-white transition-colors"
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
        <div className="border-t border-gray-700 mt-8 pt-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} Vett. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <a href="mailto:legal@vettrenters.com" className="flex items-center gap-1 hover:text-gray-300">
              <Mail className="h-3 w-3" /> legal@vettrenters.com
            </a>
            <a href="mailto:privacy@vettrenters.com" className="flex items-center gap-1 hover:text-gray-300">
              <Mail className="h-3 w-3" /> privacy@vettrenters.com
            </a>
          </div>
        </div>

        {/* FCRA disclaimer */}
        <p className="text-xs text-gray-600 mt-4 leading-relaxed">
          Vett is not a consumer reporting agency as defined by the Fair Credit Reporting Act (FCRA).
          Information on this site may not be used for tenant screening, employment, credit, or housing decisions.
          Public records are sourced from government databases and may not reflect recent changes.{' '}
          <Link href="/fcra-notice" className="underline hover:text-gray-400">See our FCRA Notice.</Link>
        </p>
      </div>
    </footer>
  )
}
