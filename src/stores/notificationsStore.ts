import { create } from 'zustand'
import { storage } from '@/lib/storage'
import { supabase } from '@/lib/supabase'
import { notificationsStateSchema, NotificationsState } from '@/schemas/notifications'

const STORAGE_KEY = 'roof-notification-prefs'

const DEFAULT_PREFS: NotificationsState = {
  instantAlerts: true,
  emailAlerts: true,
  dailyDigest: false,
}

function loadFromStorage(): NotificationsState {
  try {
    const stored = storage.getItem(STORAGE_KEY)
    if (stored) {
      const result = notificationsStateSchema.safeParse(JSON.parse(stored))
      return result.success ? result.data : DEFAULT_PREFS
    }
  } catch { /* ignore */ }
  return DEFAULT_PREFS
}

interface NotificationsStore {
  prefs: NotificationsState
  setPref: (key: keyof NotificationsState, value: boolean) => void
  syncFromRemote: (userId: string) => void
  syncToRemote: (userId: string) => void
}

export const useNotificationsStore = create<NotificationsStore>((set, get) => ({
  prefs: loadFromStorage(),

  setPref: (key, value) => {
    const next = { ...get().prefs, [key]: value }
    set({ prefs: next })
    storage.setItem(STORAGE_KEY, JSON.stringify(next))
  },

  // Load prefs from Supabase (remote wins) and merge
  syncFromRemote: (userId: string) => {
    supabase
      .from('profiles')
      .select('notification_prefs')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        if (data?.notification_prefs) {
          const result = notificationsStateSchema.safeParse(data.notification_prefs)
          if (result.success) {
            const merged = { ...get().prefs, ...result.data }
            set({ prefs: merged })
            storage.setItem(STORAGE_KEY, JSON.stringify(merged))
          }
        }
      })
  },

  // Push local prefs to Supabase
  syncToRemote: (userId: string) => {
    supabase
      .from('profiles')
      .update({ notification_prefs: get().prefs })
      .eq('id', userId)
      .then(() => {})
  },
}))
