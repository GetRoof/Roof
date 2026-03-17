import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { track } from '@/lib/analytics'

interface SavedState {
  savedIds: Set<string>
  toggleSave: (listingId: string, userId: string | null) => void
  isSaved: (id: string) => boolean
  loadSaved: (userId: string) => void
  clear: () => void
}

export const useSavedStore = create<SavedState>((set, get) => ({
  savedIds: new Set(),

  loadSaved: (userId: string) => {
    supabase
      .from('saved_listings')
      .select('listing_id')
      .eq('user_id', userId)
      .then(({ data }) => {
        if (data) set({ savedIds: new Set(data.map((r) => r.listing_id as string)) })
      })
  },

  clear: () => set({ savedIds: new Set() }),

  toggleSave: async (listingId: string, userId: string | null) => {
    const { savedIds } = get()
    const isSaving = !savedIds.has(listingId)

    track(isSaving ? 'listing_saved' : 'listing_unsaved', { listing_id: listingId })

    // Optimistic update
    const next = new Set(savedIds)
    isSaving ? next.add(listingId) : next.delete(listingId)
    set({ savedIds: next })

    if (userId) {
      try {
        if (isSaving) {
          const { error } = await supabase
            .from('saved_listings')
            .insert({ user_id: userId, listing_id: listingId })
          if (error) throw error
        } else {
          const { error } = await supabase
            .from('saved_listings')
            .delete()
            .eq('user_id', userId)
            .eq('listing_id', listingId)
          if (error) throw error
        }
      } catch {
        // Revert optimistic update on error
        const reverted = new Set(get().savedIds)
        isSaving ? reverted.delete(listingId) : reverted.add(listingId)
        set({ savedIds: reverted })
      }
    }
  },

  isSaved: (id: string) => get().savedIds.has(id),
}))
