import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { track } from '@/lib/analytics'
import { ActiveFilters, DEFAULT_FILTERS } from '@/data/filters'
import { Listing } from '@/data/listings'
import { alertSchema } from '@/schemas/alert'
import { useListingsStore } from './listingsStore'

export interface Alert {
  id: string
  name: string
  cities: string[]
  housingType: 'all' | 'room' | 'studio' | 'apartment'
  budgetMin: number
  budgetMax: number
  filters: ActiveFilters
  createdAt: string
  isMain?: boolean
}

export function alertMatchesListing(alert: Alert, l: Listing): boolean {
  if (alert.cities.length > 0 && !alert.cities.includes(l.city)) return false
  if (alert.housingType === 'room' && l.type !== 'Private room' && l.type !== 'Shared room') return false
  if (alert.housingType === 'studio' && l.type !== 'Studio') return false
  if (alert.housingType === 'apartment' && l.type !== 'Apartment') return false
  if (alert.budgetMin > 0 && l.price < alert.budgetMin) return false
  if (alert.budgetMax > 0 && l.price > alert.budgetMax) return false
  const f = alert.filters
  if (f.sizeMin && l.size < parseInt(f.sizeMin)) return false
  if (f.sizeMax && l.size > parseInt(f.sizeMax)) return false
  if (f.rooms.length > 0 && !f.rooms.some((r) => (r === 4 ? l.rooms >= 4 : l.rooms === r))) return false
  if (f.furnished !== 'all' && l.furnished !== f.furnished) return false
  if (f.neighborhoods.length > 0 && !f.neighborhoods.includes(l.neighborhood)) return false
  return true
}

function rowToAlert(row: Record<string, unknown>): Alert | null {
  const raw = {
    id: row.id,
    name: row.name,
    cities: row.cities ?? [],
    housingType: row.housing_type ?? 'all',
    budgetMin: row.budget_min ?? 0,
    budgetMax: row.budget_max ?? 0,
    filters: row.filters ?? DEFAULT_FILTERS,
    createdAt: row.created_at,
  }
  const result = alertSchema.safeParse(raw)
  return result.success ? result.data : null
}

function alertToRow(userId: string, alert: Omit<Alert, 'id' | 'createdAt'>) {
  return {
    user_id: userId,
    name: alert.name,
    cities: alert.cities,
    housing_type: alert.housingType,
    budget_min: alert.budgetMin,
    budget_max: alert.budgetMax,
    filters: alert.filters,
  }
}

interface AlertsState {
  alerts: Alert[]
  seenIds: Set<string>
  unreadCount: number
  loadAlerts: (userId: string) => Promise<void>
  addAlert: (data: Omit<Alert, 'id' | 'createdAt'>, userId: string | null) => void
  updateAlert: (id: string, data: Partial<Omit<Alert, 'id' | 'createdAt'>>, userId: string | null) => void
  removeAlert: (id: string, userId: string | null) => void
  markAllRead: () => void
  clearAlerts: () => void
}

function computeUnreadCount(alerts: Alert[], seenIds: Set<string>, listings: Listing[]): number {
  const matchIds = new Set<string>()
  alerts.forEach((alert) => {
    listings
      .filter((l) => l.isNew && alertMatchesListing(alert, l))
      .forEach((l) => matchIds.add(l.id))
  })
  let count = 0
  matchIds.forEach((id) => { if (!seenIds.has(id)) count++ })
  return count
}

export const useAlertsStore = create<AlertsState>((set, get) => {
  // Subscribe to listings store to recompute unreadCount when listings change
  useListingsStore.subscribe((listingsState) => {
    const { alerts, seenIds } = get()
    const newUnread = computeUnreadCount(alerts, seenIds, listingsState.listings)
    if (newUnread !== get().unreadCount) {
      set({ unreadCount: newUnread })
    }
  })

  return {
    alerts: [],
    seenIds: new Set(),
    unreadCount: 0,

    clearAlerts: () => set({ alerts: [], seenIds: new Set(), unreadCount: 0 }),

    loadAlerts: async (userId: string) => {
      const { data } = await supabase
        .from('alerts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
      if (data) {
        const mapped = data
          .map((r) => rowToAlert(r as Record<string, unknown>))
          .filter((a): a is Alert => a !== null)
        if (mapped.length > 0) mapped[0].isMain = true
        const listings = useListingsStore.getState().listings
        set({
          alerts: mapped,
          unreadCount: computeUnreadCount(mapped, get().seenIds, listings),
        })
      }
    },

    addAlert: async (data, userId) => {
      track('alert_created', {
        name: data.name,
        cities: data.cities,
        housing_type: data.housingType,
        budget_min: data.budgetMin,
        budget_max: data.budgetMax,
      })

      if (userId) {
        try {
          const { data: row, error } = await supabase
            .from('alerts')
            .insert(alertToRow(userId, data))
            .select()
            .single()
          if (error) throw error
          if (row) {
            const alert = rowToAlert(row as Record<string, unknown>)
            if (alert) {
              set((state) => {
                const alerts = state.alerts.length === 0
                  ? [{ ...alert, isMain: true }]
                  : [...state.alerts, alert]
                return { alerts }
              })
            }
          }
        } catch {
          // Failed to save — don't add locally
        }
      } else {
        set((state) => {
          const alert: Alert = { ...data, id: Date.now().toString(), createdAt: new Date().toISOString() }
          if (state.alerts.length === 0) alert.isMain = true
          return { alerts: [...state.alerts, alert] }
        })
      }
    },

    updateAlert: async (id, data, userId) => {
      const prev = get().alerts
      // Optimistic update
      set({
        alerts: prev.map((a) => {
          if (a.id !== id) return a
          const { isMain: _, ...safeData } = data as Partial<Alert>
          return { ...a, ...safeData }
        }),
      })

      if (userId) {
        const dbData: Record<string, unknown> = {}
        if (data.name !== undefined) dbData.name = data.name
        if (data.cities !== undefined) dbData.cities = data.cities
        if (data.housingType !== undefined) dbData.housing_type = data.housingType
        if (data.budgetMin !== undefined) dbData.budget_min = data.budgetMin
        if (data.budgetMax !== undefined) dbData.budget_max = data.budgetMax
        if (data.filters !== undefined) dbData.filters = data.filters

        try {
          const { error } = await supabase.from('alerts').update(dbData).eq('id', id)
          if (error) throw error
        } catch {
          // Revert on error
          set({ alerts: prev })
        }
      }
    },

    removeAlert: async (id, userId) => {
      const prev = get().alerts
      const target = prev.find((a) => a.id === id)
      if (target?.isMain) return // Can't delete main alert

      // Optimistic update
      set({ alerts: prev.filter((a) => a.id !== id) })

      if (userId) {
        try {
          const { error } = await supabase.from('alerts').delete().eq('id', id)
          if (error) throw error
        } catch {
          // Revert on error
          set({ alerts: prev })
        }
      }
    },

    markAllRead: () => {
      const { alerts, seenIds } = get()
      const listings = useListingsStore.getState().listings
      const next = new Set(seenIds)
      alerts.forEach((alert) => {
        listings
          .filter((l) => l.isNew && alertMatchesListing(alert, l))
          .forEach((l) => next.add(l.id))
      })
      set({ seenIds: next, unreadCount: 0 })
    },
  }
})
