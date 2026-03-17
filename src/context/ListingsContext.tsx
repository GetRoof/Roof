import { useListingsStore } from '@/stores/listingsStore'

export function useListings() {
  return useListingsStore()
}
