import { createContext, useContext, useState, useCallback, useMemo, useEffect, ReactNode } from 'react'
import { ActiveFilters, DEFAULT_FILTERS } from '../components/ui/FiltersSheet'
import { listings, Listing } from '../data/listings'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

export interface Alert {
  id: string
  name: string
  cities: string[]
  housingType: 'all' | 'room' | 'studio' | 'apartment'
  budgetMin: number
  budgetMax: number
  filters: ActiveFilters
  createdAt: string
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

// ─── DB row ↔ Alert conversion ────────────────────────────────────────────────

function rowToAlert(row: Record<string, unknown>): Alert {
  return {
    id: row.id as string,
    name: row.name as string,
    cities: (row.cities as string[]) ?? [],
    housingType: (row.housing_type as Alert['housingType']) ?? 'all',
    budgetMin: (row.budget_min as number) ?? 0,
    budgetMax: (row.budget_max as number) ?? 0,
    filters: ((row.filters as ActiveFilters) ?? DEFAULT_FILTERS),
    createdAt: row.created_at as string,
  }
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

// ─── Context ──────────────────────────────────────────────────────────────────

interface AlertsContextType {
  alerts: Alert[]
  addAlert: (data: Omit<Alert, 'id' | 'createdAt'>) => void
  updateAlert: (id: string, data: Partial<Omit<Alert, 'id' | 'createdAt'>>) => void
  removeAlert: (id: string) => void
  unreadCount: number
  markAllRead: () => void
}

const AlertsContext = createContext<AlertsContextType>({
  alerts: [],
  addAlert: () => {},
  updateAlert: () => {},
  removeAlert: () => {},
  unreadCount: 0,
  markAllRead: () => {},
})

export function AlertsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [seenIds, setSeenIds] = useState<ReadonlySet<string>>(new Set())

  // Load alerts from Supabase when user signs in
  useEffect(() => {
    if (!user) return
    supabase
      .from('alerts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) setAlerts(data.map(rowToAlert))
      })
  }, [user])

  // Clear local alerts when user signs out
  useEffect(() => {
    if (!user) setAlerts([])
  }, [user])

  const addAlert = useCallback((data: Omit<Alert, 'id' | 'createdAt'>) => {
    if (user) {
      supabase
        .from('alerts')
        .insert(alertToRow(user.id, data))
        .select()
        .single()
        .then(({ data: row }) => {
          if (row) setAlerts((prev) => [...prev, rowToAlert(row)])
        })
    } else {
      setAlerts((prev) => [
        ...prev,
        { ...data, id: Date.now().toString(), createdAt: new Date().toISOString() },
      ])
    }
  }, [user])

  const updateAlert = useCallback((id: string, data: Partial<Omit<Alert, 'id' | 'createdAt'>>) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, ...data } : a)))
    if (user) {
      const dbData: Record<string, unknown> = {}
      if (data.name !== undefined) dbData.name = data.name
      if (data.cities !== undefined) dbData.cities = data.cities
      if (data.housingType !== undefined) dbData.housing_type = data.housingType
      if (data.budgetMin !== undefined) dbData.budget_min = data.budgetMin
      if (data.budgetMax !== undefined) dbData.budget_max = data.budgetMax
      if (data.filters !== undefined) dbData.filters = data.filters
      supabase.from('alerts').update(dbData).eq('id', id)
    }
  }, [user])

  const removeAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id))
    if (user) {
      supabase.from('alerts').delete().eq('id', id)
    }
  }, [user])

  const newMatchIds = useMemo(() => {
    const ids = new Set<string>()
    alerts.forEach((alert) => {
      listings
        .filter((l) => l.isNew && alertMatchesListing(alert, l))
        .forEach((l) => ids.add(l.id))
    })
    return ids
  }, [alerts])

  const unreadCount = useMemo(() => {
    let count = 0
    newMatchIds.forEach((id) => { if (!seenIds.has(id)) count++ })
    return count
  }, [newMatchIds, seenIds])

  const markAllRead = useCallback(() => {
    setSeenIds((prev) => {
      const next = new Set(prev)
      newMatchIds.forEach((id) => next.add(id))
      return next
    })
  }, [newMatchIds])

  return (
    <AlertsContext.Provider value={{ alerts, addAlert, updateAlert, removeAlert, unreadCount, markAllRead }}>
      {children}
    </AlertsContext.Provider>
  )
}

export function useAlerts() {
  return useContext(AlertsContext)
}

export { DEFAULT_FILTERS }
