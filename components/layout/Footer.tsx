import Link from 'next/link'
import { Logo } from '@/components/Logo'
import { Shield, Mail } from 'lucide-react'

const FOOTER_LINKS = {
  Platform: [
    { href: '/search', label: 'Search Landlords' },
    { href: '/review/new', label: 'Write a Review' },
    { href: '/rights', label: 'Tenant Rights' },
    { href: '/compare', label: 'Compare Landlords' },
    { href: '/landlord-portal', label: 'Landlord Portal' },
  ],
  Company: [
    { href: '/about', label: 'About Vett' },
    { href: '/faq', label: 'FAQ' },
    { href: '/contact', label: 'Contact Us' },
    { href: '/add-landlord', label: 'Add a Landlord' },
  ],
  Legal: [
    { href: '/terms', label: 'Terms of Service' },
    { href: '/privacy', label: 'Privacy Policy' },
    { href: '/fcra-notice', label: 'FCRA Notice' },
  ],
}

const TOP_CITIES = [
  { city: 'New York', state: 'NY' },
  { city: 'Los Angeles', state: 'CA' },
  { city: 'Chicago', state: 'IL' },
  { city: 'Houston', state: 'TX' },
  { city: 'Phoenix', state: 'AZ' },
  { city: 'Philadelphia', state: 'PA' },
  { city: 'San Antonio', state: 'TX' },
  { city: 'Dallas', state: 'TX' },
  { city: 'San Francisco', state: 'CA' },
  { city: 'Austin', state: 'TX' },
  { city: 'Columbus', state: 'OH' },
  { city: 'Charlotte', state: 'NC' },
  { city: 'Miami', state: 'FL' },
  { city: 'Atlanta', state: 'GA' },
  { city: 'Boston', state: 'MA' },
  { city: 'Seattle', state: 'WA' },
  { city: 'Denver', state: 'CO' },
  { city: 'Nashville', state: 'TN' },
  { city: 'Detroit', state: 'MI' },
  { city: 'Baltimore', state: 'MD' },
  { city: 'Pittsburgh', state: 'PA' },
  { city: 'Portland', state: 'OR' },
  { city: 'Minneapolis', state: 'MN' },
]

export function Footer() {
  return (
    <footer className="bg-navy-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">

        {/* Main grid */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 mb-10">
          {/* Brand */}
          <div className="col-span-2">
            <Logo size="md" href="/" inverted />
            <p className="text-sm text-gray-400 mt-3 max-w-xs leading-relaxed">
              Lease-verified renter reviews and public records on landlords nationwide.
              Know before you rent.
            </p>
            <div className="flex items-center gap-2 mt-4 text-xs text-gray-500">
              <Shield className="h-3 w-3 flex-shrink-0" />
              <span>Section 230 protected. Not a consumer reporting agency.</span>
            </div>
            <div className="flex items-center gap-3 mt-4">
              <a href="https://twitter.com/vettrentals" target="_blank" rel="noopener noreferrer" aria-label="Vett on X"
                className="text-gray-500 hover:text-gray-300 transition-colors">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a href="https://www.linkedin.com/in/vett-%E2%80%8E-3b0727403/" target="_blank" rel="noopener noreferrer" aria-label="Vett on LinkedIn"
                className="text-gray-500 hover:text-gray-300 transition-colors">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([category, links]) => (
            <div key={category} className="col-span-1">
              <h3 className="text-white text-sm font-semibold mb-3">{category}</h3>
              <ul className="space-y-2">
                {links.map(link => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-gray-400 hover:text-white transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Top cities */}
        <div className="border-t border-gray-800 pt-8 mb-8">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Top Cities</h3>
          <div className="flex flex-wrap gap-2">
            {TOP_CITIES.map(({ city, state }) => (
              <Link
                key={`${city}-${state}`}
                href={`/city/${state.toLowerCase()}/${city.toLowerCase().replace(/\s+/g, '-')}`}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                {city}, {state}
              </Link>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <p className="text-xs text-gray-600">
            © {new Date().getFullYear()} Vett. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs text-gray-600">
            <a href="mailto:hello@vettrentals.com" className="flex items-center gap-1 hover:text-gray-400 transition-colors">
              <Mail className="h-3 w-3" /> hello@vettrentals.com
            </a>
            <a href="mailto:legal@vettrentals.com" className="flex items-center gap-1 hover:text-gray-400 transition-colors">
              <Mail className="h-3 w-3" /> legal@vettrentals.com
            </a>
          </div>
        </div>

        {/* FCRA disclaimer */}
        <p className="text-xs text-gray-700 mt-4 leading-relaxed">
          Vett is not a consumer reporting agency as defined by the Fair Credit Reporting Act (FCRA).
          Information on this site may not be used for tenant screening, employment, credit, or housing decisions.
          Public records are sourced from government databases and may not reflect recent changes.{' '}
          <Link href="/fcra-notice" className="underline hover:text-gray-500 transition-colors">See our FCRA Notice.</Link>
        </p>
      </div>
    </footer>
  )
}
