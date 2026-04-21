import type { Metadata } from 'next'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

export const metadata: Metadata = {
  title: 'FCRA Notice | Vett',
  description: 'Vett Fair Credit Reporting Act (FCRA) Notice — important information about use of this platform.',
}

export default function FcraNoticePage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 bg-amber-100 rounded-lg flex items-center justify-center">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">FCRA Notice</h1>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-8 text-sm text-amber-900">
        <p className="font-semibold mb-1">IMPORTANT NOTICE REGARDING THE FAIR CREDIT REPORTING ACT</p>
        <p>Please read this notice carefully before using Vett data for any purpose.</p>
      </div>

      <div className="space-y-6 text-sm leading-relaxed text-gray-700">
        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-2">Vett Is Not a Consumer Reporting Agency</h2>
          <p>Vett is not a &ldquo;consumer reporting agency&rdquo; as that term is defined in the Fair Credit Reporting Act (FCRA), 15 U.S.C. § 1681 et seq. The information available on Vett does not constitute a &ldquo;consumer report&rdquo; under the FCRA.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-2">Prohibited Uses</h2>
          <p>The information on Vett <strong>may NOT be used</strong> in whole or in part as a factor in:</p>
          <ul className="mt-2 list-disc list-inside space-y-1">
            <li>Determining a consumer&apos;s eligibility for residential rental housing</li>
            <li>Employment decisions</li>
            <li>Credit decisions</li>
            <li>Insurance underwriting decisions</li>
            <li>Any other purpose described in FCRA § 1681b(a)(3)</li>
          </ul>
          <p className="mt-2">Using Vett as a tenant screening tool violates our <Link href="/terms" className="text-navy-600 hover:underline">Terms of Service</Link> and may violate federal and state law.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-2">Permitted Uses</h2>
          <p>Vett is designed for use by:</p>
          <ul className="mt-2 list-disc list-inside space-y-1">
            <li>Prospective renters researching a potential landlord or property before signing a lease</li>
            <li>Current renters sharing their experience to help others after lease verification and moderation</li>
            <li>Journalists, researchers, and advocates examining housing conditions</li>
            <li>Landlords monitoring their public profile and responding to reviews</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-2">Accuracy of Public Records</h2>
          <p>Public records displayed on Vett are sourced directly from official government databases (NYC HPD, Chicago Dept of Buildings, CourtListener, etc.). Vett does not guarantee the accuracy, completeness, or timeliness of this data. Government records may contain errors. To dispute inaccurate government data, contact the issuing agency. To dispute a record as it appears on Vett, use the dispute feature on the record&apos;s page.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-2">Questions</h2>
          <p>For questions about this notice, contact <a href="mailto:legal@vettrentals.com" className="text-navy-600 hover:underline">legal@vettrentals.com</a>.</p>
        </section>
      </div>
    </div>
  )
}
