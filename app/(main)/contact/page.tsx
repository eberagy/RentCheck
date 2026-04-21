import { Mail, Shield } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contact — Vett',
  description: 'Get in touch with the Vett team.',
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
  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Contact Us</h1>
      <p className="text-gray-600 mb-10">
        We read every message. Expect a response within 2–3 business days.
      </p>

      <div className="space-y-4">
        {CONTACTS.map(({ label, email, description }) => (
          <div key={email} className="flex items-start gap-4 p-5 rounded-xl border border-gray-200 bg-white hover:border-navy-300 transition-colors">
            <div className="h-10 w-10 rounded-lg bg-navy-50 flex items-center justify-center flex-shrink-0">
              <Mail className="h-5 w-5 text-navy-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">{label}</p>
              <a href={`mailto:${email}`} className="text-navy-600 hover:text-navy-800 text-sm font-medium">
                {email}
              </a>
              <p className="text-xs text-gray-500 mt-1">{description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 flex items-start gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200 text-sm text-gray-600">
        <Shield className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
        <p>
          Vett is not a consumer reporting agency under the FCRA. For review disputes or removal requests,
          email <a href="mailto:legal@vettrentals.com" className="text-navy-600 hover:underline">legal@vettrentals.com</a> with
          the review URL and your reason.
        </p>
      </div>
    </div>
  )
}
