import type { Metadata } from 'next'
import Link from 'next/link'
import { Shield, Search, BarChart3, Scale } from 'lucide-react'

export const metadata: Metadata = {
  title: 'About Vett | Glassdoor for Landlords',
  description: 'Vett is a free platform that combines lease-verified renter reviews with public government records to help renters make informed housing decisions.',
}

export default function AboutPage() {
  const values = [
    { icon: Shield, title: 'Transparency', desc: 'We surface public records and lease-verified experiences that have historically been difficult for renters to access.' },
    { icon: Scale, title: 'Fairness', desc: 'All landlords — claimed or not — follow the same fair process. No pay-to-remove, no pay-to-hide.' },
    { icon: Search, title: 'Accuracy', desc: 'Public records are sourced directly from government APIs. Reviews require lease verification before publication.' },
    { icon: BarChart3, title: 'Empowerment', desc: 'Renters deserve the same information advantage that landlords have. We exist to level that playing field.' },
  ]

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">About Vett</h1>
      <p className="text-lg text-gray-600 mb-8 leading-relaxed">
        Vett is the transparency platform for the rental market — combining lease-verified renter reviews, housing court records, code violation histories, and eviction filings in one searchable database.
      </p>

      <h2 className="text-xl font-bold text-gray-900 mb-3">Why We Exist</h2>
      <p className="text-gray-600 mb-4 leading-relaxed">
        When you apply for a job, you can look up the company on Glassdoor. When you pick a restaurant, you check Yelp. But when you sign a 12-month lease — often the largest financial commitment in a renter&apos;s life — there&apos;s nowhere to look up the landlord&apos;s track record.
      </p>
      <p className="text-gray-600 mb-8 leading-relaxed">
        We started Vett because we believe renters deserve the same tools everyone else has. Public records like HPD violations, eviction filings, and housing court cases are publicly available — but buried, fragmented, and hard to use. We aggregate them, normalize them, and make them searchable next to lease-verified reviews from real tenants.
      </p>

      <h2 className="text-xl font-bold text-gray-900 mb-6">Our Values</h2>
      <div className="grid grid-cols-2 gap-8 mb-10">
        {values.map(({ icon: Icon, title, desc }) => (
          <div key={title}>
            <Icon className="h-5 w-5 text-teal-600 mb-3" />
            <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
            <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      <h2 className="text-xl font-bold text-gray-900 mb-3">How Reviews Work</h2>
      <p className="text-gray-600 mb-4">
        Every review on Vett goes through a moderation process. Reviewers upload their lease before publication, and our founders or moderators manually confirm it. All published reviews carry a &ldquo;Lease Verified&rdquo; badge and are screened for our{' '}
        <Link href="/terms" className="text-navy-600 hover:underline">content guidelines</Link> before publication.
      </p>

      <h2 className="text-xl font-bold text-gray-900 mb-3">How Public Records Work</h2>
      <p className="text-gray-600 mb-4">
        We pull data daily from official government APIs — NYC HPD, Chicago Dept of Buildings, SF DataSF, and more. Records are automatically linked to landlord profiles when claimed, or shown with a warning on the property address. We never modify government records; we only surface them.
      </p>

      <h2 className="text-xl font-bold text-gray-900 mb-3">Legal</h2>
      <p className="text-gray-600 mb-2">
        Vett operates under Section 230 of the Communications Decency Act for user-generated content. We are not a consumer reporting agency and our platform does not constitute a &ldquo;consumer report&rdquo; under the FCRA for general browsing. For more, see our{' '}
        <Link href="/fcra-notice" className="text-navy-600 hover:underline">FCRA Notice</Link>.
      </p>
      <p className="text-gray-600">
        If you believe any information on our platform is inaccurate, you can{' '}
        <Link href="/faq#disputes" className="text-navy-600 hover:underline">submit a dispute</Link>. Landlords can{' '}
        <Link href="/landlord-portal/claim" className="text-navy-600 hover:underline">claim their profiles</Link> to respond to reviews and correct business information.
      </p>
    </div>
  )
}
