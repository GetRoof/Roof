import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { track } from '../lib/analytics'
import { useAuth } from './AuthContext'
import { useToast } from './ToastContext'

interface SavedContextType {
  savedIds: Set<string>
  toggleSave: (listingId: string) => void
  isSaved: (id: string) => boolean
}

const SavedContext = createContext<SavedContextType>({
  savedIds: new Set(),
  toggleSave: () => {},
  isSaved: () => false,
})

const SAVE_DEBOUNCE_MS = 500

export function SavedProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const pendingWrites = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  // Load saved listings from Supabase when user signs in
  useEffect(() => {
    if (!user) return
    supabase
      .from('saved_listings')
      .select('listing_id')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (data) setSavedIds(new Set(data.map((r) => r.listing_id as string)))
      })
  }, [user])

  // Clear when user signs out
  useEffect(() => {
    if (!user) setSavedIds(new Set())
  }, [user])

  const toggleSave = (listingId: string) => {
    const isSaving = !savedIds.has(listingId)
    track(isSaving ? 'listing_saved' : 'listing_unsaved', { listing_id: listingId })
    toast(isSaving ? 'Saved to favorites' : 'Removed from favorites', isSaving ? '❤️' : undefined)

    // Optimistic local update — instant
    setSavedIds((prev) => {
      const next = new Set(prev)
      isSaving ? next.add(listingId) : next.delete(listingId)
      return next
    })

    // Debounced Supabase write — only the final state is sent
    if (user) {
      const existing = pendingWrites.current.get(listingId)
      if (existing) clearTimeout(existing)

      const userId = user.id
      pendingWrites.current.set(
        listingId,
        setTimeout(() => {
          pendingWrites.current.delete(listingId)
          // Read current state to get the final value after debounce
          setSavedIds((current) => {
            const shouldBeSaved = current.has(listingId)
            if (shouldBeSaved) {
              supabase
                .from('saved_listings')
                .upsert(
                  { user_id: userId, listing_id: listingId },
                  { onConflict: 'user_id,listing_id' },
                )
            } else {
              supabase
                .from('saved_listings')
                .delete()
                .eq('user_id', userId)
                .eq('listing_id', listingId)
            }
            return current // no mutation
          })
        }, SAVE_DEBOUNCE_MS),
      )
    }
  }

  const isSaved = (id: string) => savedIds.has(id)

  return (
    <SavedContext.Provider value={{ savedIds, toggleSave, isSaved }}>
      {children}
    </SavedContext.Provider>
  )
}

export function useSaved() {
  return useContext(SavedContext)
}
