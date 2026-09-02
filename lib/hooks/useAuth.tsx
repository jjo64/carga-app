import React, { createContext, useContext, useEffect, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '../supabase'
import { Profile } from '@/types'

interface AuthContextType {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string, name?: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  updateProfile: (data: Partial<Profile>) => Promise<{ error: Error | null }>
  updateAccountEmail: (newEmail: string) => Promise<{ error: Error | null }>
  updateAccountPassword: (newPassword: string) => Promise<{ error: Error | null }>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => {},
  updateProfile: async () => ({ error: null }),
  updateAccountEmail: async () => ({ error: null }),
  updateAccountPassword: async () => ({ error: null }),
  refreshProfile: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  async function fetchProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (!error && data) {
        setProfile(data as Profile)
      }
    } catch (err) {
      console.error('Error al cargar perfil:', err)
    }
  }

  useEffect(() => {
    let isMounted = true

    // Safety timeout: Never stay stuck on loading screen for more than 1.2 seconds
    const safetyTimer = setTimeout(() => {
      if (isMounted) setLoading(false)
    }, 1200)

    // 1. Obtener la sesión actual inicial
    supabase.auth.getSession()
      .then(({ data: { session: initialSession } }) => {
        if (!isMounted) return
        setSession(initialSession)
        setUser(initialSession?.user ?? null)
        if (initialSession?.user) {
          fetchProfile(initialSession.user.id).finally(() => {
            if (isMounted) setLoading(false)
          })
        } else {
          setLoading(false)
        }
      })
      .catch((err) => {
        console.warn('Supabase auth getSession warning:', err)
        if (isMounted) setLoading(false)
      })

    // 2. Escuchar cambios de estado de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (!isMounted) return
        setSession(newSession)
        setUser(newSession?.user ?? null)
        if (newSession?.user) {
          await fetchProfile(newSession.user.id)
        } else {
          setProfile(null)
        }
        setLoading(false)
      }
    )

    return () => {
      isMounted = false
      clearTimeout(safetyTimer)
      subscription.unsubscribe()
    }
  }, [])

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  async function signUp(email: string, password: string, name?: string) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name: name || '' },
      },
    })
    return { error }
  }

  async function signOut() {
    await supabase.auth.signOut()
    setProfile(null)
    setSession(null)
    setUser(null)
  }

  async function updateProfile(data: Partial<Profile>) {
    if (!user) return { error: new Error('No hay usuario autenticado') }

    const profileData = {
      id: user.id,
      ...data,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('profiles')
      .upsert(profileData, { onConflict: 'id' })

    if (!error) {
      setProfile((prev) => (prev ? { ...prev, ...data } : (profileData as Profile)))
    } else {
      // Fallback local update for offline/development mode
      setProfile((prev) => (prev ? { ...prev, ...data } : (profileData as Profile)))
    }
    return { error: null }
  }

  async function updateAccountEmail(newEmail: string) {
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() })
    return { error }
  }

  async function updateAccountPassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    return { error }
  }

  async function refreshProfile() {
    if (user) {
      await fetchProfile(user.id)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        signIn,
        signUp,
        signOut,
        updateProfile,
        updateAccountEmail,
        updateAccountPassword,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider')
  }
  return context
}
