import { Preferences } from '@capacitor/preferences'

/**
 * Drop-in replacement for localStorage backed by @capacitor/preferences.
 * On iOS this writes to NSUserDefaults, which survives app kills unlike
 * WKWebView's localStorage (which iOS can wipe under memory pressure).
 *
 * Usage:
 *   1. Call `await storage.hydrate()` once at startup (before React renders).
 *   2. Use `storage.getItem / setItem / removeItem` everywhere instead of localStorage.
 */
const cache = new Map<string, string>()

export const storage = {
  /** Load all persisted keys into the in-memory cache. Call once at startup. */
  async hydrate(): Promise<void> {
    try {
      const { keys } = await Preferences.keys()
      await Promise.all(
        keys.map(async (key) => {
          const { value } = await Preferences.get({ key })
          if (value !== null) cache.set(key, value)
        }),
      )
    } catch {
      // Graceful degradation if Preferences API isn't available (web/tests)
    }
  },

  getItem(key: string): string | null {
    return cache.get(key) ?? null
  },

  setItem(key: string, value: string): void {
    cache.set(key, value)
    Preferences.set({ key, value }).catch(() => {})
  },

  removeItem(key: string): void {
    cache.delete(key)
    Preferences.remove({ key }).catch(() => {})
  },
}
