import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { track } from '@/lib/analytics'

async function fetchSavedIds(userId: string): Promise<Set<string>> {
  const { data } = await supabase
    .from('saved_listings')
    .select('listing_id')
    .eq('user_id', userId)
  return new Set((data ?? []).map((r) => r.listing_id as string))
}

export function useSavedQuery(userId: string | undefined) {
  return useQuery({
    queryKey: ['saved', userId],
    queryFn: () => fetchSavedIds(userId!),
    enabled: !!userId,
  })
}

export function useToggleSaveMutation(userId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ listingId, isSaving }: { listingId: string; isSaving: boolean }) => {
      track(isSaving ? 'listing_saved' : 'listing_unsaved', { listing_id: listingId })

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
    },
    onMutate: async ({ listingId, isSaving }) => {
      await queryClient.cancelQueries({ queryKey: ['saved', userId] })
      const previous = queryClient.getQueryData<Set<string>>(['saved', userId])
      queryClient.setQueryData<Set<string>>(['saved', userId], (old) => {
        const next = new Set(old)
        isSaving ? next.add(listingId) : next.delete(listingId)
        return next
      })
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['saved', userId], context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['saved', userId] })
    },
  })
}
