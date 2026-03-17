import { create } from 'zustand'
import { z } from 'zod'
import { storage } from '@/lib/storage'

const STORAGE_KEY = 'roof_viewed_listings'
const viewedIdsSchema = z.array(z.string())

function loadFromStorage(): Set<string> {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (raw) {
      const result = viewedIdsSchema.safeParse(JSON.parse(raw))
      if (result.success) return new Set(result.data)
    }
  } catch { /* ignore */ }
  return new Set()
}

interface ViewedState {
  viewedIds: Set<string>
  markViewed: (id: string) => void
  isViewed: (id: string) => boolean
}

export const useViewedStore = create<ViewedState>((set, get) => ({
  viewedIds: loadFromStorage(),

  markViewed: (id: string) => {
    const { viewedIds } = get()
    if (viewedIds.has(id)) return
    const next = new Set(viewedIds)
    next.add(id)
    storage.setItem(STORAGE_KEY, JSON.stringify([...next]))
    set({ viewedIds: next })
  },

  isViewed: (id: string) => get().viewedIds.has(id),
}))
