import { useState, useCallback } from 'react'
import { z } from 'zod'
import { storage } from '../lib/storage'

/**
 * useState with automatic persistence via @capacitor/preferences.
 * Reads the initial value synchronously from the in-memory cache
 * (populated by storage.hydrate() at startup), so there's no flash
 * of default content on launch.
 *
 * Optionally accepts a Zod schema for runtime validation.
 * Falls back to defaultValue if the stored data doesn't match.
 */
export function usePersistedState<T>(
  key: string,
  defaultValue: T,
  schema?: z.ZodType<T>,
): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setStateInternal] = useState<T>(() => {
    const stored = storage.getItem(key)
    if (stored !== null) {
      try {
        const parsed = JSON.parse(stored)
        if (schema) {
          const result = schema.safeParse(parsed)
          return result.success ? result.data : defaultValue
        }
        return parsed as T
      } catch { /* fall through */ }
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
