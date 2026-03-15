import { createClient } from '@supabase/supabase-js'
import { Preferences } from '@capacitor/preferences'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

/**
 * Custom storage adapter using Capacitor Preferences (iOS Keychain /
 * Android SharedPreferences). Survives the app being killed — just like
 * Instagram / X — unlike localStorage which iOS can wipe.
 */
const capacitorStorage = {
  getItem: async (key: string) => {
    const { value } = await Preferences.get({ key })
    return value
  },
  setItem: async (key: string, value: string) => {
    await Preferences.set({ key, value })
  },
  removeItem: async (key: string) => {
    await Preferences.remove({ key })
  },
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storageKey: 'roof-auth',
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: capacitorStorage,
  },
})

// ─── Database types ───────────────────────────────────────────────────────────

export interface DbListing {
  id: string
  external_id: string
  title: string
  neighborhood: string | null
  city: string
  price: number
  type: string | null
  size: number | null
  rooms: number | null
  furnished: string | null
  source: string
  url: string
  image_url: string | null
  available_from: string | null
  description: string | null
  is_new: boolean
  is_active: boolean
  first_seen_at: string
  last_seen_at: string
  created_at: string
}

export interface DbAlert {
  id: string
  user_id: string
  name: string
  cities: string[]
  housing_type: 'all' | 'room' | 'studio' | 'apartment'
  budget_min: number
  budget_max: number
  filters: Record<string, unknown>
  created_at: string
}

export interface DbSavedListing {
  id: string
  user_id: string
  listing_id: string
  created_at: string
}
