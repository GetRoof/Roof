import { useState, useCallback } from 'react'
import { storage } from '../lib/storage'

/**
 * useState with automatic persistence via @capacitor/preferences.
 * Reads the initial value synchronously from the in-memory cache
 * (populated by storage.hydrate() at startup), so there's no flash
 * of default content on launch.
 */
export function usePersistedState<T>(
  key: string,
  defaultValue: T,
): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setStateInternal] = useState<T>(() => {
    const stored = storage.getItem(key)
    if (stored !== null) {
      try {
        return JSON.parse(stored) as T
      } catch {}
    }
    return defaultValue
  })

  const setState = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStateInternal((prev) => {
        const next = typeof value === 'function' ? (value as (p: T) => T)(prev) : value
        storage.setItem(key, JSON.stringify(next))
        return next
      })
    },
    [key],
  )

  return [state, setState]
}
