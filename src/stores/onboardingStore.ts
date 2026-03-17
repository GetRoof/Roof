import { create } from 'zustand'
import { storage } from '@/lib/storage'
import { onboardingDataSchema, OnboardingData } from '@/schemas/onboarding'

const STORAGE_KEY = 'roof-onboarding-data'

function loadData(): Partial<OnboardingData> {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (raw) {
      const result = onboardingDataSchema.partial().safeParse(JSON.parse(raw))
      return result.success ? result.data : {}
    }
  } catch { /* ignore */ }
  return {}
}

interface OnboardingState {
  data: Partial<OnboardingData>
  setData: (updates: Partial<OnboardingData>) => void
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  data: loadData(),

  setData: (updates: Partial<OnboardingData>) => {
    const next = { ...get().data, ...updates }
    storage.setItem(STORAGE_KEY, JSON.stringify(next))
    set({ data: next })
  },
}))
