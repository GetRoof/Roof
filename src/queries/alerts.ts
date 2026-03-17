import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Alert } from '@/stores/alertsStore'
import { alertSchema } from '@/schemas/alert'
import { DEFAULT_FILTERS } from '@/data/filters'

function rowToAlert(row: Record<string, unknown>): Alert | null {
  const raw = {
    id: row.id,
    name: row.name,
    cities: row.cities ?? [],
    housingType: row.housing_type ?? 'all',
    budgetMin: row.budget_min ?? 0,
    budgetMax: row.budget_max ?? 0,
    filters: row.filters ?? DEFAULT_FILTERS,
    createdAt: row.created_at,
  }
  const result = alertSchema.safeParse(raw)
  return result.success ? result.data : null
}

async function fetchAlerts(userId: string): Promise<Alert[]> {
  const { data } = await supabase
    .from('alerts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
  if (!data) return []
  const mapped = data
    .map((r) => rowToAlert(r as Record<string, unknown>))
    .filter((a): a is Alert => a !== null)
  if (mapped.length > 0) mapped[0].isMain = true
  return mapped
}

export function useAlertsQuery(userId: string | undefined) {
  return useQuery({
    queryKey: ['alerts', userId],
    queryFn: () => fetchAlerts(userId!),
    enabled: !!userId,
  })
}

export function useAddAlertMutation(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: Omit<Alert, 'id' | 'createdAt'>) => {
      const { data: row, error } = await supabase
        .from('alerts')
        .insert({
          user_id: userId,
          name: data.name,
          cities: data.cities,
          housing_type: data.housingType,
          budget_min: data.budgetMin,
          budget_max: data.budgetMax,
          filters: data.filters,
        })
        .select()
        .single()
      if (error) throw error
      return rowToAlert(row as Record<string, unknown>)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts', userId] })
    },
  })
}

export function useDeleteAlertMutation(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('alerts').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts', userId] })
    },
  })
}
