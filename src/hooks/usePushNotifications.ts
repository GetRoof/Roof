import { useEffect, useRef } from 'react'
import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationsContext'

/**
 * Manages push notification registration on iOS.
 *
 * - Requests permission when instantAlerts is enabled
 * - Stores device token in Supabase `push_tokens` table
 * - Removes token when instantAlerts is disabled or user signs out
 * - Handles incoming push notifications (foreground tap → navigate)
 *
 * Fix: uses useRef for user to avoid stale closures and removes
 * saveToken/removeToken from useEffect deps to prevent listener duplication.
 */
export function usePushNotifications(onOpenListing?: (listingId: string) => void) {
  const { user } = useAuth()
  const { prefs } = useNotifications()
  const tokenRef = useRef<string | null>(null)
  const userRef = useRef(user)
  const onOpenListingRef = useRef(onOpenListing)

  // Keep refs current
  userRef.current = user
  onOpenListingRef.current = onOpenListing

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    if (!user) return

    if (!prefs.instantAlerts) {
      // Remove token when disabled
      if (tokenRef.current) {
        supabase
          .from('push_tokens')
          .delete()
          .eq('user_id', user.id)
          .eq('token', tokenRef.current)
          .then(() => { tokenRef.current = null })
      }
      return
    }

    let isMounted = true

    const register = async () => {
      let permStatus = await PushNotifications.checkPermissions()

      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions()
      }

      if (permStatus.receive !== 'granted') {
        console.log('[Push] Permission not granted:', permStatus.receive)
        return
      }

      PushNotifications.addListener('registration', (token) => {
        if (isMounted && userRef.current) {
          console.log('[Push] Token:', token.value)
          tokenRef.current = token.value
          supabase.from('push_tokens').upsert(
            {
              user_id: userRef.current.id,
              token: token.value,
              platform: 'ios',
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,token' },
          )
        }
      })

      PushNotifications.addListener('registrationError', (err) => {
        console.error('[Push] Registration error:', err.error)
      })

      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('[Push] Foreground:', notification.title)
      })

      PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        const listingId = action.notification.data?.listing_id
        if (listingId && onOpenListingRef.current) {
          onOpenListingRef.current(listingId)
        }
      })

      await PushNotifications.register()
    }

    register()

    return () => {
      isMounted = false
      PushNotifications.removeAllListeners()
    }
  }, [user?.id, prefs.instantAlerts]) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    removeToken: async () => {
      if (!user || !tokenRef.current) return
      await supabase
        .from('push_tokens')
        .delete()
        .eq('user_id', user.id)
        .eq('token', tokenRef.current)
      tokenRef.current = null
    },
  }
}
