import Link from 'next/link'
import { Info } from 'lucide-react'

interface FCRADisclaimerProps {
  variant?: 'full' | 'short' | 'inline'
}

export function FCRADisclaimer({ variant = 'short' }: FCRADisclaimerProps) {
  if (variant === 'inline') {
    return (
      <span className="text-xs text-gray-500">
        Not a consumer report.{' '}
        <Link href="/fcra-notice" className="underline hover:text-gray-700">FCRA Notice</Link>
      </span>
    )
  }

  if (variant === 'short') {
    return (
      <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
        <Info className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-blue-800 leading-snug">
          Public records are for informational purposes only and may not be used for tenant
          screening decisions. Not a consumer report under the FCRA.{' '}
          <Link href="/fcra-notice" className="font-medium underline hover:no-underline">
            See FCRA Notice
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
      <div className="flex items-center gap-2 mb-2">
        <Info className="h-4 w-4 text-blue-500" />
        <span className="font-semibold text-blue-900">Important Notice</span>
      </div>
      <p className="text-blue-800 leading-relaxed">
        RentCheck is not a consumer reporting agency as defined by the Fair Credit Reporting Act
        (FCRA), 15 U.S.C. § 1681 et seq. The information on this page — including renter reviews
        and publicly sourced records — does not constitute a &ldquo;consumer report&rdquo; as defined by the
        FCRA and may not be used to make housing, employment, credit, or insurance decisions.{' '}
        <Link href="/fcra-notice" className="font-medium underline hover:no-underline">
          Read our full FCRA Notice →
        </Link>
      </p>
    </div>
  )
}
