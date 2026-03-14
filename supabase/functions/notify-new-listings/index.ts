/**
 * notify-new-listings — Supabase Edge Function
 *
 * Triggered via Database Webhook when new listings are inserted.
 * Checks if any user alerts match the new listing and sends notifications.
 *
 * Setup:
 *   1. Deploy: supabase functions deploy notify-new-listings
 *   2. In Supabase Dashboard → Database → Webhooks:
 *      - Table: listings
 *      - Events: INSERT
 *      - URL: https://<project>.supabase.co/functions/v1/notify-new-listings
 *      - HTTP Headers: Authorization: Bearer <service_role_key>
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WebhookPayload {
  type: 'INSERT'
  table: string
  record: {
    id: string
    title: string
    city: string
    price: number
    type: string | null
    source: string
    neighborhood: string | null
    image_url: string | null
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceKey)

    const payload: WebhookPayload = await req.json()
    const listing = payload.record

    if (!listing) {
      return new Response(JSON.stringify({ error: 'No record in payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Find alerts that match this listing
    const { data: alerts, error: alertsError } = await supabase
      .from('alerts')
      .select('*, profiles!alerts_user_id_fkey(email, name)')

    if (alertsError || !alerts?.length) {
      return new Response(JSON.stringify({ matched: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const matched = alerts.filter((alert: any) => {
      // City match
      if (alert.cities?.length > 0 && !alert.cities.includes(listing.city)) return false
      // Budget match
      if (alert.budget_max > 0 && listing.price > alert.budget_max) return false
      if (alert.budget_min > 0 && listing.price < alert.budget_min) return false
      // Housing type match
      if (alert.housing_type !== 'all') {
        const typeMap: Record<string, string[]> = {
          room: ['Private room', 'Room'],
          studio: ['Studio'],
          apartment: ['Apartment'],
        }
        const allowed = typeMap[alert.housing_type] || []
        if (listing.type && !allowed.includes(listing.type)) return false
      }
      return true
    })

    // Log matches (in production, this would send push notifications or emails)
    console.log(`Listing "${listing.title}" in ${listing.city} matched ${matched.length} alert(s)`)

    // Future: send push notifications via FCM, web push, or email via Resend
    // For now, the match count is logged and can be polled by the app

    return new Response(
      JSON.stringify({
        listing_id: listing.id,
        matched: matched.length,
        alert_ids: matched.map((a: any) => a.id),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('Error:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
