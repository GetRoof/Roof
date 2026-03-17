import { supabase } from './supabase'

/**
 * Lightweight analytics — fire-and-forget event tracking to Supabase.
 * Errors are logged in dev mode so tracking issues are visible during development.
 */
export function track(event: string, properties?: Record<string, unknown>) {
  ;(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const user_id = session?.user?.id ?? null

      await supabase.from('analytics_events').insert({
        user_id,
        event,
        properties: properties ?? {},
      })
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn('[Analytics]', event, err)
      }
    }
  })()
}
