import { useQuery } from '@tanstack/react-query'
import { fetchFromSupabase } from '@/lib/listings'

export function useListingsQuery() {
  return useQuery({
    queryKey: ['listings'],
    queryFn: fetchFromSupabase,
  })
}
