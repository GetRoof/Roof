import { createContext, useContext, useState, ReactNode } from 'react'

interface OnboardingData {
  name: string
  purposes: string[]
  housingType: string
  country: string
  cities: string[]
  budgetMin: number
  budgetMax: number
  interests: string[]
  sizeMin: number
  sizeMax: number
  bedrooms: number[]
  interior: string
}

interface OnboardingContextType {
  data: Partial<OnboardingData>
  setData: (updates: Partial<OnboardingData>) => void
}

const OnboardingContext = createContext<OnboardingContextType>({
  data: {},
  setData: () => {},
})

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [data, setDataState] = useState<Partial<OnboardingData>>({})

  const setData = (updates: Partial<OnboardingData>) => {
    setDataState((prev) => ({ ...prev, ...updates }))
  }

  return (
    <OnboardingContext.Provider value={{ data, setData }}>
      {children}
    </OnboardingContext.Provider>
  )
}

export function useOnboarding() {
  return useContext(OnboardingContext)
}
