import { useState, useEffect } from 'react'

/**
 * Tracks network connectivity. Uses Capacitor Network plugin on iOS,
 * falls back to navigator.onLine + event listeners for web.
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    let cleanup: (() => void) | undefined

    async function init() {
      try {
        const { Network } = await import('@capacitor/network')
        const status = await Network.getStatus()
        setIsOnline(status.connected)

        const handle = await Network.addListener('networkStatusChange', (s) => {
          setIsOnline(s.connected)
        })
        cleanup = () => handle.remove()
      } catch {
        // Fallback for web (non-Capacitor environments)
        setIsOnline(navigator.onLine)
        const onOnline = () => setIsOnline(true)
        const onOffline = () => setIsOnline(false)
        window.addEventListener('online', onOnline)
        window.addEventListener('offline', onOffline)
        cleanup = () => {
          window.removeEventListener('online', onOnline)
          window.removeEventListener('offline', onOffline)
        }
      }
    }

    init()
    return () => cleanup?.()
  }, [])

  return isOnline
}
