import { create } from 'zustand'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

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

interface AuthState {
  session: Session | null
  user: User | null
  loading: boolean
  signUp: (email: string, password: string, name: string) => Promise<{ error: string | null }>
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signInWithGoogle: () => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => {
  // Initialize auth state
  supabase.auth.getSession().then(({ data: { session } }) => {
    set({ session, user: session?.user ?? null, loading: false })
  })

  // Listen for auth changes
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    set({ session, user: session?.user ?? null })
    if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
      set({ loading: false })
    }
  })

  // Re-check session when app returns from background
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      supabase.auth.getSession().then(({ data: { session } }) => {
        set({ session, user: session?.user ?? null })
      })
    }
  }
  document.addEventListener('visibilitychange', handleVisibilityChange)

  // Cleanup stored for reference (not typically needed for a singleton store)
  void subscription
  void handleVisibilityChange

  return {
    session: null,
    user: null,
    loading: true,

    signUp: async (email, password, name) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      })
      if (!error && data.user) {
        sendWelcomeEmail(email, name)
      }
      return { error: error?.message ?? null }
    },

    signIn: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      return { error: error?.message ?? null }
    },

    signInWithGoogle: async () => {
      const isNative = !!(window as unknown as Record<string, unknown>).Capacitor
        && (window as unknown as Record<string, { isNative?: boolean }>).Capacitor?.isNative
      const redirectTo = isNative
        ? 'com.hugovinicius.roof://app/rooms'
        : `${window.location.origin}/app/rooms`

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      })

      if (error) {
        const msg = error.message || ''
        if (msg.includes('provider') || msg.includes('not enabled') || msg.includes('Unsupported')) {
          return { error: 'Google sign-in is not yet configured. Please enable the Google provider in the Supabase Dashboard under Authentication → Providers.' }
        }
        return { error: msg }
      }
      return { error: null }
    },

    signOut: async () => {
      await supabase.auth.signOut()
    },
  }
})
