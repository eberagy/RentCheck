'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
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
    }).catch(() => {
      // Auth lookup failed (network, expired refresh token, etc.) — treat
      // as signed-out instead of leaving loading=true forever. The user
      // can still try to sign in fresh; the only cost is a brief blank
      // navbar instead of one stuck on its skeleton.
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
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
      if (!mountedRef.current) return
      setProfile(data)
    } catch {
      // Network or unexpected error reading the profile row. Don't strand
      // the UI on the loading skeleton — render as signed-in-no-profile.
      if (!mountedRef.current) return
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
