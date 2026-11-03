import React, { createContext, useContext, useEffect, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { Teacher } from '../types'

// Admin email - can be overridden with VITE_ADMIN_EMAIL (fallback kept for compatibility)
export const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL as string) || 'mrproject343@gmail.com'

interface AuthContextType {
  session: Session | null
  user: User | null
  teacher: Teacher | null
  loading: boolean
  isAdmin: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  refreshTeacher: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [teacher, setTeacher] = useState<Teacher | null>(null)
  const [loading, setLoading] = useState(true)

  const isAdmin = user?.email === ADMIN_EMAIL

  const fetchTeacher = async (userId: string) => {
    const { data } = await supabase
      .from('teachers')
      .select('*')
      .eq('user_id', userId)
      .single()
    setTeacher(data ?? null)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        const isAdminUser = session.user.email === ADMIN_EMAIL
        if (isAdminUser) setLoading(false)
        else fetchTeacher(session.user.id).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        const isAdminUser = session.user.email === ADMIN_EMAIL
        if (!isAdminUser) fetchTeacher(session.user.id)
      } else {
        setTeacher(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithGoogle = async () => {
    // Respect Vite base path (e.g. /ekhtaberni/) so OAuth callback works on GitHub Pages / subpath deploys
    const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '')
    const redirectTo = `${window.location.origin}${base}/auth/callback`

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setTeacher(null)
  }

  const refreshTeacher = async () => {
    if (user) await fetchTeacher(user.id)
  }

  return (
    <AuthContext.Provider value={{ session, user, teacher, loading, isAdmin, signInWithGoogle, signOut, refreshTeacher }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
