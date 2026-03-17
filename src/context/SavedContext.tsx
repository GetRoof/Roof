import { useEffect } from 'react'
import { useSavedStore } from '@/stores/savedStore'
import { useAuth } from './AuthContext'

export function useSaved() {
  const { user } = useAuth()
  const store = useSavedStore()

  useEffect(() => {
    if (user) {
      store.loadSaved(user.id)
    } else {
      store.clear()
    }
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    savedIds: store.savedIds,
    toggleSave: (listingId: string) => store.toggleSave(listingId, user?.id ?? null),
    isSaved: store.isSaved,
  }
}
