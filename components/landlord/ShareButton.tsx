'use client'

import { useEffect, useRef, useState } from 'react'
import { Share2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ShareButtonProps {
  name: string
}

export function ShareButton({ name }: ShareButtonProps) {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Clear the "Copied!" timer on unmount so we don't try to setState
  // on a component that's gone (and so navigating away within 2s
  // doesn't leak the timer).
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  async function handleShare() {
    const url = window.location.href
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: `${name} Reviews on Vett`, url })
        return
      } catch {
        // User cancelled share or not supported — fall through to clipboard
      }
    }
    await navigator.clipboard.writeText(url)
    setCopied(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleShare}
      className="text-slate-600 border-slate-200 hover:border-slate-300"
    >
      {copied
        ? <><Check className="h-3.5 w-3.5 mr-1.5 text-teal-600" /> Copied!</>
        : <><Share2 className="h-3.5 w-3.5 mr-1.5" /> Share</>
      }
    </Button>
  )
}
