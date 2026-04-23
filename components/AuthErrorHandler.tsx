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
    } else if (error === 'auth_failed') {
      toast.error('Authentication failed. Please try again.')
    } else if (error === 'account_suspended') {
      toast.error('Your account is suspended. Email support@vettrentals.com if this is a mistake.', { duration: 8000 })
    } else if (errorDesc) {
      toast.error(decodeURIComponent(errorDesc.replace(/\+/g, ' ')))
    }

    // Clean the error params from the URL without navigating away
    const url = new URL(window.location.href)
    url.searchParams.delete('error')
    url.searchParams.delete('error_code')
    url.searchParams.delete('error_description')
    router.replace(url.pathname + url.search, { scroll: false })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
