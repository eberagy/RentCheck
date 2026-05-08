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
    } else {
      // Don't reflect raw `error_description` from the query string —
      // an attacker could craft a phishing link like
      //   /?error=x&error_description=Visit+evil.tld+to+continue
      // and the toast would display attacker-controlled copy on our
      // domain. Always fall back to a generic message; the original
      // errorDesc is still in the URL params if a developer needs it.
      void errorDesc
      toast.error('Sign-in failed. Please try again.')
    }

    // Clean the error params from the URL without navigating away.
    // Preserve hash so deep-linked anchors (#email-preferences,
    // #public-profile) survive the cleanup.
    const url = new URL(window.location.href)
    url.searchParams.delete('error')
    url.searchParams.delete('error_code')
    url.searchParams.delete('error_description')
    router.replace(url.pathname + url.search + url.hash, { scroll: false })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
