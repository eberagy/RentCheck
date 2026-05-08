import { Mail, Shield } from 'lucide-react'
import type { Metadata } from 'next'
import { jsonLdSafe } from '@/lib/json-ld'
import Script from 'next/script'
import { canonicalSiteUrl } from '@/lib/canonical-host'

export const metadata: Metadata = {
  title: 'Contact — Vett',
  description: 'Get in touch with the Vett team.',
  alternates: { canonical: '/contact' },
}

const CONTACTS = [
  {
    label: 'General Inquiries',
    email: 'hello@vettrentals.com',
    description: 'Questions about how Vett works, feedback, or partnership inquiries.',
  },
  {
    label: 'Legal & Disputes',
    email: 'legal@vettrentals.com',
    description: 'Review disputes, DMCA notices, defamation claims, or legal correspondence.',
  },
  {
    label: 'Privacy Requests',
    email: 'privacy@vettrentals.com',
    description: 'Data deletion requests, CCPA/GDPR inquiries, or privacy-related concerns.',
  },
]

export default function ContactPage() {
  const siteUrl = canonicalSiteUrl()
  // ContactPage schema — tells Google this is the canonical contact
  // surface for the Vett organization, with each routing email surfaced
  // as a ContactPoint. Helps the org card in SERPs show real contacts
  // instead of "no info available".
  const contactJsonLd = jsonLdSafe({
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    url: `${siteUrl}/contact`,
    mainEntity: {
      '@type': 'Organization',
      '@id': `${siteUrl}/#organization`,
      name: 'Vett',
      url: siteUrl,
      contactPoint: CONTACTS.map(c => ({
        '@type': 'ContactPoint',
        contactType: c.label,
        email: c.email,
        availableLanguage: 'English',
      })),
    },
  })
  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <Script id="contact-jsonld" type="application/ld+json" strategy="beforeInteractive">
        {contactJsonLd}
      </Script>
      <h1 className="font-display text-[clamp(2rem,4vw,3rem)] leading-[1.08] tracking-tight text-slate-900 mb-2">Contact Us</h1>
      <p className="text-slate-600 mb-10">
        We read every message. Expect a response within 2–3 business days.
      </p>

      <div className="space-y-3">
        {CONTACTS.map(({ label, email, description }) => (
          <div key={email} className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors hover:border-navy-300">
            <div className="h-10 w-10 rounded-2xl bg-navy-50 ring-1 ring-navy-100 flex items-center justify-center flex-shrink-0 text-navy-600">
              <Mail className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="font-semibold text-slate-900 text-sm">{label}</p>
              <a href={`mailto:${email}`} className="text-navy-600 hover:text-navy-800 text-sm font-medium rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500 focus-visible:ring-offset-2">
                {email}
              </a>
              <p className="text-xs text-slate-500 mt-1">{description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 flex items-start gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-sm text-slate-600">
        <Shield className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <p>
          Vett is not a consumer reporting agency under the FCRA. For review disputes or removal requests,
          email <a href="mailto:legal@vettrentals.com" className="text-navy-600 hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500 focus-visible:ring-offset-2">legal@vettrentals.com</a> with
          the review URL and your reason.
        </p>
      </div>
    </div>
  )
}
