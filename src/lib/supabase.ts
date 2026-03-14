import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storageKey: 'roof-auth',
    autoRefreshToken: true,
    detectSessionInUrl: true,
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
