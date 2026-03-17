import { useEffect } from 'react'
import { useAlertsStore, Alert, alertMatchesListing } from '@/stores/alertsStore'
import { DEFAULT_FILTERS } from '@/data/filters'
import { useAuth } from './AuthContext'

export { type Alert, alertMatchesListing, DEFAULT_FILTERS }

export function useAlerts() {
  const { user } = useAuth()
  const store = useAlertsStore()

  // Load alerts on user change
  useEffect(() => {
    if (user) {
      store.loadAlerts(user.id)
    } else {
      store.clearAlerts()
    }
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reload alerts when app returns from background
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && user) {
        store.loadAlerts(user.id)
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    alerts: store.alerts,
    addAlert: (data: Omit<Alert, 'id' | 'createdAt'>) => store.addAlert(data, user?.id ?? null),
    updateAlert: (id: string, data: Partial<Omit<Alert, 'id' | 'createdAt'>>) => store.updateAlert(id, data, user?.id ?? null),
    removeAlert: (id: string) => store.removeAlert(id, user?.id ?? null),
    unreadCount: store.unreadCount,
    markAllRead: store.markAllRead,
  }
}
