import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Profile, Business, UserRole } from '../types'

type AuthContextValue = {
  session: Session | null
  loading: boolean
  profile: Profile | null
  business: Business | null
  role: UserRole | null
  isStaff: boolean
  isOwnerOrManager: boolean
  isPlatformAdmin: boolean
  refreshProfile: () => Promise<void>
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string) => Promise<{ error: string | null }>
  resetPassword: (email: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [business, setBusiness] = useState<Business | null>(null)
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  async function loadProfile(userId: string) {
    const [{ data: prof }, { data: adminRow }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('platform_admins').select('user_id').eq('user_id', userId).maybeSingle(),
    ])
    setProfile((prof as Profile) ?? null)
    setIsPlatformAdmin(Boolean(adminRow))
    if (prof?.business_id) {
      const { data: biz } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', prof.business_id)
        .maybeSingle()
      setBusiness((biz as Business) ?? null)
    } else {
      setBusiness(null)
    }
  }

  async function refreshProfile() {
    if (!session?.user?.id) return
    await loadProfile(session.user.id)
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      if (data.session?.user?.id) await loadProfile(data.session.user.id)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      if (newSession?.user?.id) {
        loadProfile(newSession.user.id)
      } else {
        setProfile(null)
        setBusiness(null)
        setIsPlatformAdmin(false)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  async function signUp(email: string, password: string) {
    const { error } = await supabase.auth.signUp({ email, password })
    return { error: error?.message ?? null }
  }

  async function resetPassword(email: string) {
    const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, '')}/login`
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    return { error: error?.message ?? null }
  }

  async function signOut() {
    await supabase.auth.signOut()
    setProfile(null)
    setBusiness(null)
    setIsPlatformAdmin(false)
  }

  const role = profile?.role ?? null
  const isStaff = role === 'owner' || role === 'manager' || role === 'employee'
  const isOwnerOrManager = role === 'owner' || role === 'manager'

  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        profile,
        business,
        role,
        isStaff,
        isOwnerOrManager,
        isPlatformAdmin,
        refreshProfile,
        signIn,
        signUp,
        resetPassword,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
