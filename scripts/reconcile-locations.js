/**
 * reconcile-locations.js
 * 
 * Find listings in the database missing latitude/longitude,
 * revisit their URLs, and attempt to resolve their coordinates.
 * 
 * Usage: node reconcile-locations.js
 */

const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env') })
const { createClient } = require('@supabase/supabase-js')
const { chromium } = require('playwright')
const { extractCoordsFromHtml, extractZipcodeFromHtml, geocode } = require('./lib/geocoding')

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function reconcile() {
  console.log('🔍 Starting location reconciliation...')

  // 1. Fetch listings missing coordinates
  const { data: listings, error } = await supabase
    .from('listings')
    .select('id, url, title, city, neighborhood')
    .is('latitude', null)
    .limit(100) // Process in batches to avoid rate limits or timeouts

  if (error) {
    console.error('❌ Error fetching listings:', error.message)
    return
  }

  if (!listings || listings.length === 0) {
    console.log('✅ No listings missing coordinates. Everything looks good!')
    return
  }

  console.log(`📡 Found ${listings.length} listings to reconcile.`)

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  })

  for (const listing of listings) {
    console.log(`\n📄 Processing: ${listing.title} (${listing.url.slice(0, 50)}...)`)
    
    try {
      const page = await context.newPage()
      await page.goto(listing.url, { waitUntil: 'domcontentloaded', timeout: 30000 })
      
      const html = await page.content()
      
      // Try 1: Extract direct coordinates from HTML
      let coords = extractCoordsFromHtml(html)
      
      // Try 2: Extract Zipcode and Geocode
      if (!coords) {
        const zipcode = extractZipcodeFromHtml(html)
        if (zipcode) {
          console.log(`    📍 Found zipcode: ${zipcode}`)
          coords = await geocode(listing.title, listing.city, zipcode)
        } else {
          // Try 3: Fallback geocode with Title + Neighborhood + City
          console.log('    📍 No coordinates or zipcode found. Trying fallback geocoding...')
          coords = await geocode(`${listing.title}, ${listing.neighborhood || ''}`, listing.city)
        }
      }

      if (coords && coords.lat && coords.lon) {
        console.log(`    ✅ Success: (${coords.lat}, ${coords.lon})`)
        
        const { error: updateError } = await supabase
          .from('listings')
          .update({
            latitude: coords.lat,
            longitude: coords.lon
          })
          .eq('id', listing.id)

        if (updateError) {
          console.error(`    ❌ Update failed: ${updateError.message}`)
        }
      } else {
        console.log('    ⚠️  Could not resolve location for this listing.')
      }

      await page.close()
      
      // Respect Nominatim rate limits (1 req/s)
      await new Promise(r => setTimeout(r, 1500))

    } catch (err) {
      console.error(`    ❌ Error processing ${listing.url}:`, err.message)
    }
  }

  await browser.close()
  console.log('\n🏁 Reconciliation complete.')
}

reconcile().catch(err => console.error('FATAL ERROR:', err))
