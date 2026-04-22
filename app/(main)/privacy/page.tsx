import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Vett Privacy Policy',
}

export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="font-display text-[clamp(2rem,4vw,3rem)] leading-[1.08] tracking-tight text-slate-900 mb-2">Privacy Policy</h1>
      <p className="text-sm text-gray-500 mb-8">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

      <div className="space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-gray-900">Information We Collect</h2>
          <ul className="mt-2 space-y-1 text-gray-600 list-disc list-inside">
            <li><strong>Account data:</strong> Name, email address, and profile picture from Google OAuth.</li>
            <li><strong>Review content:</strong> Reviews, ratings, and lease documents you submit for verification.</li>
            <li><strong>Usage data:</strong> Search queries, pages visited, and interactions (via PostHog analytics).</li>
            <li><strong>Verification documents:</strong> Lease documents and landlord verification documents, stored securely in private Supabase Storage buckets and reviewed only by our founders and moderators. Never shared publicly.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">How We Use Your Information</h2>
          <ul className="mt-2 space-y-1 text-gray-600 list-disc list-inside">
            <li>To operate the platform and moderate content.</li>
            <li>To verify lease documents and landlord claims (admin review only).</li>
            <li>To send transactional emails (review approved/rejected, watchlist alerts).</li>
            <li>To improve platform features and fix bugs via aggregated analytics.</li>
          </ul>
          <p className="mt-2 text-gray-600">We do not sell your personal information to third parties.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">Document Storage</h2>
          <p className="text-gray-600">Lease documents are stored in a private, encrypted Supabase Storage bucket. Only Vett founders and moderators can access them for verification purposes. We delete verification documents after the review window closes or after your request is resolved, unless we need to retain them longer for safety, dispute resolution, or legal reasons.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">Cookies & Analytics</h2>
          <p className="text-gray-600">We use PostHog (privacy-focused analytics) to understand how users interact with the platform. We do not use advertising cookies or share data with ad networks. You can opt out of analytics in your browser settings.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">Data Retention</h2>
          <p className="text-gray-600">Account data is retained while your account is active. Reviews remain on the platform after account deletion unless a removal request is submitted. Contact <a href="mailto:privacy@vettrentals.com" className="text-navy-600 hover:underline">privacy@vettrentals.com</a> to request data deletion.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">Your Rights</h2>
          <p className="text-gray-600">Depending on your jurisdiction, you may have rights to access, correct, or delete your personal data. Email <a href="mailto:privacy@vettrentals.com" className="text-navy-600 hover:underline">privacy@vettrentals.com</a> with your request. We will respond within 30 days.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">Contact</h2>
          <p className="text-gray-600">For privacy inquiries: <a href="mailto:privacy@vettrentals.com" className="text-navy-600 hover:underline">privacy@vettrentals.com</a></p>
        </section>
      </div>
    </div>
  )
}
