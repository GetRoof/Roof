import { create } from 'zustand'
import { Listing } from '@/data/listings'
import { supabase } from '@/lib/supabase'
import { rowToListing, fetchFromSupabase } from '@/lib/listings'

const knownIds = new Set<string>()

interface ListingsState {
  listings: Listing[]
  loading: boolean
  refreshing: boolean
  newCount: number
  refresh: () => Promise<void>
  clearNewCount: () => void
}

export const useListingsStore = create<ListingsState>((set) => {
  // Initial fetch
  fetchFromSupabase().then((data) => {
    data.forEach((l) => knownIds.add(l.id))
    set({ listings: data, loading: false })
  })

  // Realtime subscription
  const channel = supabase
    .channel('listings-realtime')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'listings' },
      (payload) => {
        const newListing = rowToListing(payload.new as Record<string, unknown>)
        if (newListing && !knownIds.has(newListing.id)) {
          knownIds.add(newListing.id)
          set((state) => ({
            listings: [newListing, ...state.listings],
            newCount: state.newCount + 1,
          }))
        }
      }
    )
    .subscribe()

  void channel

  return {
    listings: [],
    loading: true,
    refreshing: false,
    newCount: 0,

    refresh: async () => {
      set({ refreshing: true })
      supabase.functions.invoke('trigger-scrape').catch(() => {})
      const data = await fetchFromSupabase()
      data.forEach((l) => knownIds.add(l.id))
      set({ listings: data, refreshing: false })
    },

    clearNewCount: () => set({ newCount: 0 }),
  }
})
