import Link from 'next/link'
import { AlertCircle } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { SOURCE_LABELS } from '@/types'

interface DataAccuracyNoteProps {
  source: string
  lastSynced: string | null
  recordId?: string
}

export function DataAccuracyNote({ source, lastSynced, recordId }: DataAccuracyNoteProps) {
  const sourceLabel = SOURCE_LABELS[source] ?? source
  return (
    <span className="flex items-start gap-1 text-xs text-gray-400 mt-1">
      <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
      <span>
        Source: {sourceLabel}. Last updated: {formatDate(lastSynced)}. Data may not reflect recent changes.{' '}
        {recordId && (
          <Link href={`/dispute?record=${recordId}`} className="underline hover:text-gray-600">
            Dispute this record
          </Link>
        )}
      </span>
    </span>
  )
}
