'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { captureException } from '@/lib/sentry'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/types'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!mountedRef.current) return
      setUser(user)
      if (user) loadProfile(user.id)
      else setLoading(false)
    }).catch(err => {
      // Auth lookup failed (network, expired refresh token, etc.) — treat
      // as signed-out instead of leaving loading=true forever. The user
      // can still try to sign in fresh; the only cost is a brief blank
      // navbar instead of one stuck on its skeleton. Capture so a sustained
      // outage shows up in Sentry instead of as quiet "site looks logged
      // out for everyone."
      captureException(err, { where: 'useAuth:getUser' })
      if (!mountedRef.current) return
      setUser(null)
      setProfile(null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mountedRef.current) return
      setUser(session?.user ?? null)
      if (session?.user) loadProfile(session.user.id)
      else { setProfile(null); setLoading(false) }
    })

    return () => {
      mountedRef.current = false
      subscription.unsubscribe()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadProfile(userId: string) {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
      if (!mountedRef.current) return
      // PGRST116 = no row, a legitimate state for a freshly-signed-in
      // user whose profile row hasn't been created yet by the auth
      // callback. Anything else is a real DB problem worth knowing
      // about — without capturing, a transient hiccup left users
      // looking like they had no profile (no nav badge, no portal
      // link) and we'd never know.
      if (error && error.code !== 'PGRST116') {
        captureException(error, { where: 'useAuth:loadProfile', userId })
      }
      setProfile(data)
    } catch (err) {
      // Network or unexpected error reading the profile row. Don't strand
      // the UI on the loading skeleton — render as signed-in-no-profile.
      if (!mountedRef.current) return
      captureException(err, { where: 'useAuth:loadProfile-throw', userId })
      setProfile(null)
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }

  async function signInWithGoogle(redirectTo?: string) {
    return supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback${redirectTo ? `?next=${redirectTo}` : ''}`,
      },
    })
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return {
    user,
    profile,
    loading,
    isAdmin: profile?.user_type === 'admin',
    isLandlord: profile?.user_type === 'landlord',
    signInWithGoogle,
    signOut,
  }
}
