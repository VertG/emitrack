'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { getUserCity } from '@/lib/location'

type AuthContextType = {
  user: User | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Cek session aktif
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen perubahan auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
        if (
          (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') &&
          session?.user
        ) {
          const u = session.user
          const name =
            u.user_metadata?.full_name ??
            u.user_metadata?.name ??
            u.email?.split('@')[0] ??   // guaranteed fallback
            null
          ensureProfile(u.id, name)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  async function ensureProfile(userId: string, name?: string | null) {
    const city = await getUserCity()

    // Insert row if it doesn't exist (ignoreDuplicates keeps existing data intact)
    await supabase.from('profiles').upsert(
      { id: userId, username: name ?? null, kota: city },
      { onConflict: 'id', ignoreDuplicates: true }
    )

    // Fetch to see if any fields are still missing (e.g. from older accounts)
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, kota')
      .eq('id', userId)
      .single()

    if (profile) {
      const updates: any = {}
      if (!profile.username && name) updates.username = name
      // Overwrite if it's missing or if it's the old hardcoded 'Jakarta'
      if (!profile.kota || profile.kota === 'Jakarta') updates.kota = city

      if (Object.keys(updates).length > 0) {
        const hasChanges = Object.keys(updates).some(k => updates[k] !== (profile as any)[k])
        if (hasChanges) {
          const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', userId)

          if (error) {
            console.warn('[auth] profile update failed:', error.message)
          }
        }
      }
    }
  }

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` }
    })
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
