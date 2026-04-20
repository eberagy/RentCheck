'use client'

import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'

export function AuthErrorHandler() {
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const error = searchParams.get('error')
    const errorCode = searchParams.get('error_code')
    const errorDesc = searchParams.get('error_description')

    if (!error) return

    if (errorCode === 'otp_expired') {
      toast.error('Magic link expired — please request a new one', { duration: 6000 })
    } else if (error === 'access_denied') {
      toast.error('Sign-in failed. Please try again.')
    } else if (errorDesc) {
      toast.error(decodeURIComponent(errorDesc.replace(/\+/g, ' ')))
    }

    // Clean the error params from the URL
    router.replace('/', { scroll: false })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
