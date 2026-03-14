import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { Listing } from '../data/listings'

interface ListingsContextType {
  listings: Listing[]
  loading: boolean
  refreshing: boolean
  refresh: () => Promise<void>
  newCount: number
  clearNewCount: () => void
}

const ListingsContext = createContext<ListingsContextType>({
  listings: [],
  loading: true,
  refreshing: false,
  refresh: async () => {},
  newCount: 0,
  clearNewCount: () => {},
})

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

// Map Supabase DB row → app Listing shape
function rowToListing(row: Record<string, unknown>): Listing {
  const firstSeen = (row.first_seen_at as string) ?? new Date().toISOString()
  return {
    id: row.id as string,
    title: row.title as string,
    neighborhood: (row.neighborhood as string) ?? '',
    city: row.city as string,
    price: row.price as number,
    type: (row.type as Listing['type']) ?? 'Apartment',
    size: (row.size as number) ?? 0,
    rooms: (row.rooms as number) ?? 0,
    furnished: (row.furnished as Listing['furnished']) ?? 'furnished',
    source: (row.source as Listing['source']) ?? 'Pararius',
    url: row.url as string,
    image: (row.image_url as string) ?? '',
    availableFrom: (row.available_from as string) ?? '',
    isNew: (row.is_new as boolean) ?? false,
    postedAt: relativeTime(firstSeen),
    description: (row.description as string) ?? '',
  }
}

async function fetchFromSupabase(): Promise<Listing[]> {
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('is_active', true)
    .order('first_seen_at', { ascending: false })
  if (data && !error) return data.map(rowToListing)
  return []
}

export function ListingsProvider({ children }: { children: ReactNode }) {
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [newCount, setNewCount] = useState(0)
  const knownIds = useRef<Set<string>>(new Set())

  useEffect(() => {
    fetchFromSupabase().then((data) => {
      setListings(data)
      data.forEach((l) => knownIds.current.add(l.id))
      setLoading(false)
    })

    // Subscribe to new listings via Supabase Realtime
    const channel = supabase
      .channel('listings-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'listings' },
        (payload) => {
          const newListing = rowToListing(payload.new as Record<string, unknown>)
          if (!knownIds.current.has(newListing.id)) {
            knownIds.current.add(newListing.id)
            setListings((prev) => [newListing, ...prev])
            setNewCount((prev) => prev + 1)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    const data = await fetchFromSupabase()
    setListings(data)
    data.forEach((l) => knownIds.current.add(l.id))
    setRefreshing(false)
  }, [])

  const clearNewCount = useCallback(() => setNewCount(0), [])

  return (
    <ListingsContext.Provider value={{ listings, loading, refreshing, refresh, newCount, clearNewCount }}>
      {children}
    </ListingsContext.Provider>
  )
}

export function useListings() {
  return useContext(ListingsContext)
}
