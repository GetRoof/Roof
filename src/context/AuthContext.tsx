import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

async function sendWelcomeEmail(email: string, name: string) {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    await supabase.functions.invoke('send-welcome-email', {
      body: { email, name },
      headers: session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {},
    })
  } catch {
    // Non-blocking — email failure should never break signup
  }
}

interface AuthContextType {
  session: Session | null
  user: User | null
  loading: boolean
  signUp: (email: string, password: string, name: string) => Promise<{ error: string | null }>
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signInWithGoogle: () => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signUp: async () => ({ error: null }),
  signIn: async () => ({ error: null }),
  signInWithGoogle: async () => ({ error: null }),
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      // Don't resolve loading if an OAuth fragment is pending — wait for onAuthStateChange
      const hasOAuthFragment = window.location.hash.includes('access_token')
      if (!hasOAuthFragment) setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (_event === 'TOKEN_REFRESHED' || _event === 'SIGNED_IN' || _event === 'INITIAL_SESSION') {
        setLoading(false)
      }
    })

    // Re-check session when app returns from background (Capacitor)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        supabase.auth.getSession().then(({ data: { session } }) => {
          setSession(session)
        })
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      subscription.unsubscribe()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  const signUp = async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    })
    if (!error && data.user) {
      sendWelcomeEmail(email, name)
    }
    return { error: error?.message ?? null }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  const signInWithGoogle = async () => {
    const isNative = !!(window as any).Capacitor?.isNative
    const redirectTo = isNative
      ? 'com.hugovinicius.roof://app/rooms'
      : `${window.location.origin}/app/rooms`

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })

    if (error) {
      // Supabase returns a generic error when the provider isn't configured
      const msg = error.message || ''
      if (msg.includes('provider') || msg.includes('not enabled') || msg.includes('Unsupported')) {
        return { error: 'Google sign-in is not yet configured. Please enable the Google provider in the Supabase Dashboard under Authentication → Providers.' }
      }
      return { error: msg }
    }
    return { error: null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signUp, signIn, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
