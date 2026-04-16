'use client'

import { useState } from 'react'
import { Share2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ShareButtonProps {
  name: string
}

export function ShareButton({ name }: ShareButtonProps) {
  const [copied, setCopied] = useState(false)

  async function handleShare() {
    const url = window.location.href
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: `${name} Reviews on RentCheck`, url })
        return
      } catch {
        // User cancelled share or not supported — fall through to clipboard
      }
    }
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleShare}
      className="text-gray-600 border-gray-200 hover:border-gray-300"
    >
      {copied
        ? <><Check className="h-3.5 w-3.5 mr-1.5 text-teal-600" /> Copied!</>
        : <><Share2 className="h-3.5 w-3.5 mr-1.5" /> Share</>
      }
    </Button>
  )
}
