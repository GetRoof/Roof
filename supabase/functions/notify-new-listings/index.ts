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

interface ListingEmail {
  firstName: string
  title: string
  city: string
  neighborhood: string | null
  price: number
  type: string | null
  source: string
  imageUrl: string | null
}

function buildNotificationHtml(l: ListingEmail): string {
  const locationLine = l.neighborhood ? `${l.neighborhood}, ${l.city}` : l.city
  const typeLine = l.type ? ` · ${l.type}` : ''
  const imageBlock = l.imageUrl
    ? `<tr><td style="padding:0 40px 24px;"><img src="${l.imageUrl}" alt="" width="100%" style="border-radius:12px;max-height:220px;object-fit:cover;" /></td></tr>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#f8f8f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8f8f7;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;">
        <tr><td style="padding:32px 40px 24px;">
          <p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;color:#71717a;">New listing alert</p>
          <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;line-height:1.2;color:#09090b;">Hey ${l.firstName}, a new place just dropped</h1>
          <p style="margin:0;font-size:15px;color:#52525b;">A listing matching your alert was just posted on ${l.source}.</p>
        </td></tr>
        ${imageBlock}
        <tr><td style="padding:0 40px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;border-radius:12px;">
            <tr><td style="padding:20px 24px;">
              <p style="margin:0 0 4px;font-size:17px;font-weight:700;color:#09090b;">${l.title}</p>
              <p style="margin:0 0 12px;font-size:14px;color:#71717a;">${locationLine}${typeLine}</p>
              <p style="margin:0;font-size:22px;font-weight:700;color:#09090b;">€${l.price.toLocaleString()}<span style="font-size:14px;font-weight:400;color:#71717a;">/month</span></p>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:0 40px 32px;">
          <a href="https://getroof.nl/app/rooms" style="display:inline-block;background-color:#09090b;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:100px;">View listing →</a>
        </td></tr>
        <tr><td style="padding:24px 40px;background-color:#fafafa;border-top:1px solid #f4f4f5;">
          <p style="margin:0;font-size:12px;color:#a1a1aa;line-height:1.6;">You're receiving this because you have an active alert on Roof. <a href="https://getroof.nl/app/alerts" style="color:#52525b;">Manage alerts</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
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

    console.log(`Listing "${listing.title}" in ${listing.city} matched ${matched.length} alert(s)`)

    // Send email notifications via Resend
    const resendKey = Deno.env.get('RESEND_API_KEY')
    const emailResults: { alertId: string; email: string; success: boolean; error?: string }[] = []

    if (resendKey && matched.length > 0) {
      for (const alert of matched) {
        const profile = alert.profiles
        if (!profile?.email) continue

        const firstName = profile.name?.split(' ')[0] ?? 'there'
        const neighborhood = listing.neighborhood ? ` in ${listing.neighborhood}` : ''
        const subject = `New listing${neighborhood} — €${listing.price}/mo`

        const html = buildNotificationHtml({
          firstName,
          title: listing.title,
          city: listing.city,
          neighborhood: listing.neighborhood,
          price: listing.price,
          type: listing.type,
          source: listing.source,
          imageUrl: listing.image_url,
        })

        try {
          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${resendKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'Roof <hello@getroof.nl>',
              to: profile.email,
              subject,
              html,
            }),
          })

          const data = await res.json()
          emailResults.push({
            alertId: alert.id,
            email: profile.email,
            success: res.ok,
            error: res.ok ? undefined : JSON.stringify(data),
          })
        } catch (err) {
          emailResults.push({
            alertId: alert.id,
            email: profile.email,
            success: false,
            error: (err as Error).message,
          })
        }
      }
    }

    return new Response(
      JSON.stringify({
        listing_id: listing.id,
        matched: matched.length,
        alert_ids: matched.map((a: any) => a.id),
        emails_sent: emailResults.filter((r) => r.success).length,
        email_errors: emailResults.filter((r) => !r.success),
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
