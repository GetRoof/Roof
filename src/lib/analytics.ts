import { supabase } from './supabase'
import { trackEvent, EventName } from './amplitude'

/**
 * Batched analytics — events are queued in memory and flushed to Supabase
 * every 2 seconds or when the buffer reaches 10 events. Amplitude calls
 * remain immediate (the SDK batches internally).
 *
 * Events are also flushed when the page becomes hidden (app backgrounded)
 * so nothing is lost on navigation or app kill.
 */

interface QueuedEvent {
  event: string
  properties: Record<string, unknown>
  timestamp: string
}

let queue: QueuedEvent[] = []
let flushTimer: ReturnType<typeof setTimeout> | null = null

const FLUSH_INTERVAL_MS = 2_000
const MAX_BUFFER_SIZE = 10

async function flush() {
  if (queue.length === 0) return
  const batch = queue.splice(0)

  try {
    const { data: { session } } = await supabase.auth.getSession()
    const user_id = session?.user?.id ?? null

    await supabase.from('analytics_events').insert(
      batch.map((e) => ({
        user_id,
        event: e.event,
        properties: e.properties,
      })),
    )
  } catch {
    // Silently ignore — analytics should never break the app
  }
}

function scheduleFlush() {
  if (flushTimer) return
  flushTimer = setTimeout(() => {
    flushTimer = null
    flush()
  }, FLUSH_INTERVAL_MS)
}

// Flush when the app is backgrounded so no events are lost
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush()
  })
}

/**
 * Track an analytics event. Sends to Amplitude immediately and
 * batches the Supabase insert for efficiency.
 *
 * Signature unchanged from the original — all call sites are compatible.
 */
export function track(event: string, properties?: Record<string, unknown>) {
  trackEvent(event as EventName, properties)

  queue.push({
    event,
    properties: properties ?? {},
    timestamp: new Date().toISOString(),
  })

  if (queue.length >= MAX_BUFFER_SIZE) {
    flush()
  } else {
    scheduleFlush()
  }
}
