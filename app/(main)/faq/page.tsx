import type { Metadata } from 'next'
import Link from 'next/link'
import Script from 'next/script'
import { ChevronDown } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Frequently Asked Questions',
  description:
    'How Vett verifies reviews, where public records come from, how to dispute a record, how landlords claim their profile, and more.',
  alternates: { canonical: '/faq' },
}

const FAQS = [
  {
    id: 'how-reviews',
    q: 'How does Vett verify reviews?',
    a: 'When you submit a review, you upload your lease agreement before publication. Our founders and moderators manually review the lease to confirm you lived at the property and rented from the landlord in question. Published reviews display a "Lease Verified" badge only after that review is complete.',
  },
  {
    id: 'who-can-review',
    q: 'Who can submit a review?',
    a: 'Anyone who has rented a residential property can start a review. You must sign in with Google so reviews are tied to a real account, and a lease upload is required before the review can be published.',
  },
  {
    id: 'public-records',
    q: 'Where do public records come from?',
    a: 'We pull directly from official government open data APIs: NYC HPD (housing violations), NYC DOB (building complaints), Chicago Dept of Buildings, San Francisco DataSF, Boston ISD, Philadelphia L&I, Austin Code, Seattle SDCI, and more. Records are refreshed daily. We also pull from CourtListener (court cases) and the Eviction Lab (eviction filing data). We never modify these records.',
  },
  {
    id: 'disputes',
    q: 'How do I dispute an inaccurate public record?',
    a: 'On any public record card, click "Dispute this record." You can submit a reason and supporting evidence. Our admin team reviews disputes typically within 5-7 business days. If a record is found to be inaccurate, we will update or remove it. For errors in the underlying government data, we will refer you to the source agency.',
  },
  {
    id: 'landlord-claim',
    q: "I'm a landlord. How do I claim my profile?",
    a: 'Visit the Landlord Portal, click "Claim a Profile," search for your name or company, and upload a verification document (utility bill, property deed, government ID + proof of property, or business registration). Our team reviews claims within 48 hours. Verified landlords can respond to reviews publicly.',
  },
  {
    id: 'respond-to-reviews',
    q: 'As a landlord, can I respond to reviews?',
    a: 'Yes — once your profile is verified. Responses go through our admin review process before appearing publicly. Responses must be professional and follow our content guidelines. We do not allow threats, doxxing, or retaliatory content.',
  },
  {
    id: 'remove-review',
    q: 'Can a landlord remove a review?',
    a: 'No. Landlords cannot remove reviews. If you believe a review violates our content guidelines (defamation, false facts, spam, personal information), you can flag it for our admin team to review. We will remove reviews that violate our policies.',
  },
  {
    id: 'fcra',
    q: 'Is Vett a consumer reporting agency?',
    a: 'No. Vett is a public-facing review and public records platform. We are not a consumer reporting agency (CRA) under the Fair Credit Reporting Act (FCRA), and our platform should not be used as a "consumer report" for employment, credit, insurance, or tenant screening decisions. See our FCRA Notice for full details.',
  },
  {
    id: 'privacy',
    q: 'Are reviews anonymous?',
    a: 'Your public reviewer name comes from your profile settings. You can keep it minimal, and we never display your email address or exact location publicly.',
  },
  {
    id: 'college',
    q: 'Why the focus on college towns?',
    a: 'College students are among the most vulnerable renters — many signing their first lease with limited information. We specifically seed landlord data in major college markets and partner with student organizations to distribute the platform.',
  },
]

export default function FAQPage() {
  const faqJsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map(faq => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: { '@type': 'Answer', text: faq.a },
    })),
  })
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <Script id="faq-jsonld" type="application/ld+json" strategy="beforeInteractive">
        {faqJsonLd}
      </Script>
      <h1 className="font-display text-[clamp(2rem,4vw,3rem)] leading-[1.08] tracking-tight text-slate-900 mb-3">Frequently Asked Questions</h1>
      <p className="text-gray-500 mb-10">
        Can&apos;t find your answer? Email{' '}
        <a href="mailto:support@vettrentals.com" className="text-navy-600 hover:underline font-medium">
          support@vettrentals.com
        </a>
      </p>

      <div>
        {FAQS.map(faq => (
          <details key={faq.id} id={faq.id} className="group border-b border-gray-100 [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer items-center justify-between gap-4 py-4 text-left list-none">
              <span className="font-semibold text-sm text-gray-900 transition-colors group-hover:text-gray-700 group-open:text-teal-700">
                {faq.q}
              </span>
              <ChevronDown className="h-4 w-4 flex-shrink-0 text-gray-300 transition-transform group-open:rotate-180 group-open:text-teal-500" />
            </summary>
            <div className="pb-4">
              <p className="text-sm text-gray-700 leading-relaxed">{faq.a}</p>
            </div>
          </details>
        ))}
      </div>

      <div className="mt-10 pt-6 border-t border-gray-100 text-sm text-gray-400">
        <p className="font-semibold text-gray-600 mb-1">Legal Notice</p>
        <p className="leading-relaxed">
          Vett&apos;s public records data is sourced from official government databases and is provided for
          informational purposes only. We are not responsible for errors in source data. Read our{' '}
          <Link href="/fcra-notice" className="text-teal-600 hover:underline">FCRA Notice</Link>,{' '}
          <Link href="/privacy" className="text-teal-600 hover:underline">Privacy Policy</Link>, and{' '}
          <Link href="/terms" className="text-teal-600 hover:underline">Terms of Service</Link>.
        </p>
      </div>
    </div>
  )
}
