import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { storage } from '../lib/storage'

interface ViewedContextType {
  viewedIds: Set<string>
  markViewed: (id: string) => void
  isViewed: (id: string) => boolean
}

const STORAGE_KEY = 'roof_viewed_listings'

function loadFromStorage(): Set<string> {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (raw) return new Set(JSON.parse(raw) as string[])
  } catch { /* ignore */ }
  return new Set()
}

const ViewedContext = createContext<ViewedContextType>({
  viewedIds: new Set(),
  markViewed: () => {},
  isViewed: () => false,
})

export function ViewedProvider({ children }: { children: ReactNode }) {
  const [viewedIds, setViewedIds] = useState<Set<string>>(loadFromStorage)

  const markViewed = useCallback((id: string) => {
    setViewedIds((prev) => {
      if (prev.has(id)) return prev
      const next = new Set(prev)
      next.add(id)
      storage.setItem(STORAGE_KEY, JSON.stringify([...next]))
      return next
    })
  }, [])

  const isViewed = useCallback((id: string) => viewedIds.has(id), [viewedIds])

  return (
    <ViewedContext.Provider value={{ viewedIds, markViewed, isViewed }}>
      {children}
    </ViewedContext.Provider>
  )
}

export function useViewed() {
  return useContext(ViewedContext)
}
