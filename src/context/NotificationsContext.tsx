import { useEffect } from 'react'
import { useNotificationsStore } from '@/stores/notificationsStore'
import { useAuth } from './AuthContext'

export function useNotifications() {
  const { user } = useAuth()
  const store = useNotificationsStore()

  // Sync from remote on login, push to remote on pref change
  useEffect(() => {
    if (!user) return
    store.syncFromRemote(user.id)
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user) return
    store.syncToRemote(user.id)
  }, [user, store.prefs]) // eslint-disable-line react-hooks/exhaustive-deps

  return { prefs: store.prefs, setPref: store.setPref }
}
