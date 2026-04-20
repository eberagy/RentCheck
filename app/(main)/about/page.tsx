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
    <div>
      {/* Hero */}
      <div className="bg-slate-50 border-b border-gray-100 py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs uppercase tracking-widest text-teal-600 font-semibold mb-3">About Vett</p>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-4">
            The transparency platform<br className="hidden sm:block" /> for renters.
          </h1>
          <p className="text-lg text-gray-500 leading-relaxed max-w-2xl">
            Lease-verified renter reviews, housing court records, code violation histories, and eviction filings — all in one searchable database.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Why we exist */}
        <div className="mb-12">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-4">Why we exist</h2>
          <div className="space-y-4 text-gray-600 leading-relaxed">
            <p>
              When you apply for a job, you can look up the company on Glassdoor. When you pick a restaurant, you check Yelp. But when you sign a 12-month lease — often the largest financial commitment in a renter&apos;s life — there&apos;s nowhere to look up the landlord&apos;s track record.
            </p>
            <p>
              We started Vett because renters deserve the same tools everyone else has. Public records like HPD violations, eviction filings, and housing court cases exist — but they&apos;re buried, fragmented, and hard to use. We aggregate them, normalize them, and make them searchable alongside lease-verified reviews from real tenants.
            </p>
          </div>
        </div>

        {/* Values */}
        <div className="mb-12">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-8">Our values</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {values.map(({ icon: Icon, title, desc }) => (
              <div key={title}>
                <div className="h-0.5 w-8 rounded-full bg-teal-500 mb-5" />
                <Icon className="h-5 w-5 text-teal-600 mb-3" />
                <h3 className="font-bold text-gray-900 mb-1.5">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div className="border-t border-gray-100 pt-10 mb-10">
          <h2 className="text-xl font-bold text-gray-900 mb-3">How reviews work</h2>
          <p className="text-gray-600 leading-relaxed">
            Every review on Vett goes through a moderation process. Reviewers upload their lease before publication, and our founders or moderators manually confirm it. All published reviews carry a &ldquo;Lease Verified&rdquo; badge and are screened for our{' '}
            <Link href="/terms" className="text-teal-600 hover:underline">content guidelines</Link> before publication.
          </p>
        </div>

        <div className="border-t border-gray-100 pt-10 mb-10">
          <h2 className="text-xl font-bold text-gray-900 mb-3">How public records work</h2>
          <p className="text-gray-600 leading-relaxed">
            We pull data daily from official government APIs — NYC HPD, Chicago Dept of Buildings, SF DataSF, and more. Records are automatically linked to landlord profiles when claimed, or shown with a warning on the property address. We never modify government records; we only surface them.
          </p>
        </div>

        <div className="border-t border-gray-100 pt-10">
          <h2 className="text-xl font-bold text-gray-900 mb-3">Legal</h2>
          <div className="space-y-3 text-gray-600 leading-relaxed">
            <p>
              Vett operates under Section 230 of the Communications Decency Act for user-generated content. We are not a consumer reporting agency and our platform does not constitute a &ldquo;consumer report&rdquo; under the FCRA. For more, see our{' '}
              <Link href="/fcra-notice" className="text-teal-600 hover:underline">FCRA Notice</Link>.
            </p>
            <p>
              If you believe any information on our platform is inaccurate, you can{' '}
              <Link href="/faq#disputes" className="text-teal-600 hover:underline">submit a dispute</Link>. Landlords can{' '}
              <Link href="/landlord-portal/claim" className="text-teal-600 hover:underline">claim their profiles</Link> to respond to reviews and correct business information.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
