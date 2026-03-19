import { useState, useCallback } from 'react'
import { storage } from '../lib/storage'

/**
 * Module-level debounce map for storage writes.
 * Keyed by storage key so each persisted value gets its own timer.
 * React state updates remain instant — only the async Capacitor
 * Preferences write is delayed (300ms).
 */
const pendingWrites = new Map<string, ReturnType<typeof setTimeout>>()
const STORAGE_DEBOUNCE_MS = 300

function debouncedStorageWrite(key: string, value: string) {
  const existing = pendingWrites.get(key)
  if (existing) clearTimeout(existing)
  pendingWrites.set(
    key,
    setTimeout(() => {
      storage.setItem(key, value)
      pendingWrites.delete(key)
    }, STORAGE_DEBOUNCE_MS),
  )
}

/**
 * useState with automatic persistence via @capacitor/preferences.
 * Reads the initial value synchronously from the in-memory cache
 * (populated by storage.hydrate() at startup), so there's no flash
 * of default content on launch.
 *
 * Storage writes are debounced by 300ms to avoid spamming disk on
 * rapid input (e.g. typing in filter fields). The in-memory cache
 * in storage.ts always has the latest value regardless.
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
        debouncedStorageWrite(key, JSON.stringify(next))
        return next
      })
    },
    [key],
  )

  return [state, setState]
}
