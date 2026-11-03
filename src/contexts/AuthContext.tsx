import React, { createContext, useContext, useEffect, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { Teacher } from '../types'

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
    try {
      const { data } = await supabase
        .from('teachers')
        .select('*')
        .eq('user_id', userId)
        .single()
      setTeacher(data ?? null)
    } catch (err) {
      console.error('[Auth] fetchTeacher failed', err)
      setTeacher(null)
    }
  }

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      try {
        if (!isSupabaseConfigured) {
          if (!cancelled) setLoading(false)
          return
        }

        const { data: { session } } = await supabase.auth.getSession()
        if (cancelled) return

        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          const isAdminUser = session.user.email === ADMIN_EMAIL
          if (isAdminUser) {
            setLoading(false)
          } else {
            await fetchTeacher(session.user.id)
            if (!cancelled) setLoading(false)
          }
        } else {
          setLoading(false)
        }
      } catch (err) {
        console.error('[Auth] getSession failed', err)
        if (!cancelled) setLoading(false)
      }
    }

    init()

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

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  const signInWithGoogle = async () => {
    if (!isSupabaseConfigured) {
      alert('Supabase غير مضبوط. ضع VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY في ملف .env')
      return
    }

    const redirectTo = `${window.location.origin}/auth/callback`

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.error('[Auth] signOut failed', err)
    }
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
