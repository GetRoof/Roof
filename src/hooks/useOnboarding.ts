import { useState, useCallback } from 'react'
import { storage } from '../lib/storage'

const STORAGE_KEY = 'roof-onboarding-complete'

export function useOnboarding() {
  const [showTour, setShowTour] = useState(() => {
    return storage.getItem(STORAGE_KEY) !== 'true'
  })

  const completeTour = useCallback(() => {
    storage.setItem(STORAGE_KEY, 'true')
    setShowTour(false)
  }, [])

  const skipTour = useCallback(() => {
    storage.setItem(STORAGE_KEY, 'true')
    setShowTour(false)
  }, [])

  return { showTour, completeTour, skipTour }
}
