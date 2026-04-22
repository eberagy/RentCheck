import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service | Vett',
  description: 'Vett Terms of Service',
}

export default function TermsPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="font-display text-[clamp(2rem,4vw,3rem)] leading-[1.08] tracking-tight text-slate-900 mb-2">Terms of Service</h1>
      <p className="text-sm text-gray-500 mb-8">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

      <div className="max-w-none text-sm leading-relaxed space-y-6 text-gray-600">
        <section>
          <h2 className="text-lg font-semibold text-gray-900">1. Acceptance of Terms</h2>
          <p>By accessing or using Vett (&ldquo;Service&rdquo;), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">2. Use of the Service</h2>
          <p>You may use Vett for lawful personal, non-commercial purposes only. You agree not to: scrape or systematically extract data, post defamatory or false content, submit fake reviews, use the platform for tenant screening in violation of FCRA, or attempt to circumvent our moderation systems.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">3. User-Generated Content</h2>
          <p>You retain ownership of reviews and content you submit. By submitting content, you grant Vett a worldwide, royalty-free license to display, distribute, and moderate that content. You represent that you have personal knowledge of the facts stated in your review and, where requested, can provide a lease or other verification document supporting your experience.</p>
          <p className="mt-2">We reserve the right to remove content that violates our guidelines, including content that is defamatory, contains personal information, is fraudulent, or cannot be verified through our review process before publication.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">4. Public Records Disclaimer</h2>
          <p>Public records displayed on Vett are sourced from official government databases. We do not warrant the completeness or accuracy of government-sourced data. Records are provided as-is for informational purposes. To dispute a government record, contact the issuing agency directly.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">5. Not a Consumer Reporting Agency</h2>
          <p>Vett is not a consumer reporting agency as defined under the Fair Credit Reporting Act (FCRA). The Service is not intended to be used for employment screening, credit decisions, insurance underwriting, or residential tenant screening. Any such use is expressly prohibited. See our FCRA Notice for details.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">6. Fair Housing Act</h2>
          <p>Vett does not collect or display information about the race, color, national origin, religion, sex, familial status, or disability of any landlord or tenant. Reviews that contain discriminatory content will be removed. Users may not use this platform to discriminate in violation of the Fair Housing Act.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">7. Section 230</h2>
          <p>Vett operates as an interactive computer service under 47 U.S.C. § 230. We are not the publisher or speaker of user-generated reviews and are not liable for such content.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">8. Limitation of Liability</h2>
          <p>TO THE MAXIMUM EXTENT PERMITTED BY LAW, VETT SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE SERVICE.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">9. Changes to Terms</h2>
          <p>We may update these Terms at any time. Continued use of the Service after changes constitutes acceptance. Material changes will be announced via email to registered users.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">10. Contact</h2>
          <p>For questions about these Terms, contact us at <a href="mailto:legal@vettrentals.com" className="text-navy-600 hover:underline">legal@vettrentals.com</a>.</p>
        </section>
      </div>
    </div>
  )
}
