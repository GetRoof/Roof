/**
 * Rentola scraper — scrapes rentola.nl and upserts into Supabase
 *
 * Usage:
 *   node scrape-rentola.js
 *   node scrape-rentola.js --city Amsterdam --type apartment --max 1500
 *
 * Required env: SUPABASE_SERVICE_KEY
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') })
const { chromium } = require('playwright')
const { createClient } = require('@supabase/supabase-js')
const crypto = require('crypto')
const { extractZipcodeFromHtml, geocode } = require('./lib/geocoding')

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://wzsdnhzsosonlcgubmxe.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || ''

let supabase = null
if (SUPABASE_SERVICE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
}

const DEFAULTS = { cities: ['Amsterdam'], housingType: 'all', budgetMax: 1500 }

function parseCLI() {
  const args = process.argv.slice(2)
  const get = (flag) => { const i = args.indexOf(flag); return i !== -1 && args[i + 1] ? args[i + 1] : null }
  return {
    cities: get('--city') ? [get('--city')] : DEFAULTS.cities,
    housingType: get('--type') || DEFAULTS.housingType,
    budgetMax: get('--max') ? parseInt(get('--max')) : DEFAULTS.budgetMax,
  }
}

function buildSearchUrl(city, housingType, budgetMax) {
  const citySlug = city.toLowerCase().replace(/\s+/g, '-')
  // Rentola URL pattern: /huren/city?type=X&price_to=Y
  let url = `https://www.rentola.nl/huren/${citySlug}`
  const params = []
  if (housingType === 'room') params.push('type=room')
  else if (housingType === 'studio') params.push('type=studio')
  else if (housingType === 'apartment') params.push('type=apartment')
  if (budgetMax > 0) params.push(`price_to=${budgetMax}`)
  if (params.length > 0) url += '?' + params.join('&')
  return url
}

function stableId(url) {
  return crypto.createHash('sha256').update(`Rentola:${url}`).digest('hex').slice(0, 32)
}

function mapType(text) {
  const t = (text || '').toLowerCase()
  if (t.includes('room') || t.includes('kamer')) return 'Private room'
  if (t.includes('studio')) return 'Studio'
  if (t.includes('apartment') || t.includes('appartement')) return 'Apartment'
  if (t.includes('shared') || t.includes('gedeeld')) return 'Shared room'
  return 'Apartment'
}

async function scrapePage(page, url, city) {
  console.log(`\n  Fetching: ${url}`)
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 })

  // Handle cookie consent — Rentola uses CookieYes
  const consent = page.locator('button.cky-btn-accept, button:has-text("Alle cookies accepteren"), button:has-text("Accept All")')
  if (await consent.first().isVisible({ timeout: 3000 }).catch(() => false)) {
    await consent.first().click()
    await page.waitForTimeout(1000)
  }

  // Wait for content and scroll to lazy-load
  await page.waitForTimeout(3000)
  for (let i = 0; i < 15; i++) {
    await page.evaluate(() => window.scrollBy(0, 400))
    await page.waitForTimeout(300)
  }

  const results = await page.evaluate((city) => {
    // Rentola cards: div.rounded-xl.border inside <ul>, with <a href="/listings/..."> inside
    const cards = document.querySelectorAll('div.rounded-xl.border')

    const seen = new Set()
    return Array.from(cards).map(card => {
      try {
        // Find the listing link
        const link = card.querySelector('a[href*="/listings/"]')
        const href = link?.getAttribute('href') || ''
        if (!href) return null
        const listingUrl = href.startsWith('http') ? href : 'https://www.rentola.nl' + href

        // Dedup
        if (seen.has(listingUrl)) return null
        seen.add(listingUrl)

        const allText = card.textContent || ''

        // Price: "1.450 € / maand" or "731 € / maand"
        const priceMatch = allText.match(/([\d.,]+)\s*€/)
        let price = 0
        if (priceMatch) {
          price = parseInt(priceMatch[1].replace(/\./g, '').replace(',', ''))
        }
        if (price <= 0 || price > 10000) return null

        // Size: "65 m²" from "van 65 m²"
        const sizeMatch = allText.match(/(\d+)\s*m²/)
        const size = sizeMatch ? parseInt(sizeMatch[1]) : null

        // Rooms: "2-slaapkamer" or "1-slaapkamer"
        const roomsMatch = allText.match(/(\d+)-slaapkamer/i)
        const rooms = roomsMatch ? parseInt(roomsMatch[1]) : null

        // Image
        const imgEl = card.querySelector('img')
        const imageUrl = imgEl?.getAttribute('src') || imgEl?.getAttribute('data-src') || null

        // Type from text: "appartement", "huis", "kamer", "studio"
        let listingType = 'Apartment'
        const textLower = allText.toLowerCase()
        if (textLower.includes('kamer') && !textLower.includes('slaapkamer')) listingType = 'Private room'
        else if (textLower.includes('studio')) listingType = 'Studio'
        else if (textLower.includes('huis')) listingType = 'Apartment'

        // Location: "Amsterdamse Poort, Flierbosdreef, 1102 CN Amsterdam"
        // Pattern: after m² and before the price
        let neighborhood = ''
        const locMatch = allText.match(/m²(.+?)(?:\d+[.,]\d+\s*€|Netherlands)/s)
        if (locMatch) {
          const locText = locMatch[1].trim()
          // Take first part (neighborhood/area name) before the street address
          const parts = locText.split(',').map(s => s.trim())
          if (parts.length > 0) {
            neighborhood = parts[0]
            // If first part looks like an area, use it; otherwise try second
            if (neighborhood.match(/^\d/) && parts.length > 1) {
              neighborhood = parts[1]
            }
          }
        }

        const title = neighborhood ? `${listingType} in ${neighborhood}` : `${listingType} in ${city}`

        return {
          title,
          price,
          priceText: `€${price}`,
          url: listingUrl,
          imageUrl: imageUrl && !imageUrl.startsWith('data:') ? imageUrl : null,
          size,
          rooms,
          city,
          neighborhood,
          listingType,
          furnished: null,
        }
      } catch { return null }
    }).filter(Boolean)
  }, city)

  console.log(`  Found ${(results || []).length} listings`)
  return results || []
}

async function scrapeAllPages(page, startUrl, city, maxPages = 3) {
  const all = []
  let currentUrl = startUrl
  let pageNum = 1

  while (currentUrl && pageNum <= maxPages) {
    console.log(`\n📄 Page ${pageNum}`)
    const results = await scrapePage(page, currentUrl, city)
    all.push(...results)

    // Try pagination
    const nextBtn = page.locator('a[rel="next"], button:has-text("Next"), button:has-text("Volgende"), a:has-text("Next"), [class*="pagination"] a:last-child').first()
    const hasNext = await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)
    if (hasNext && results.length > 0) {
      await nextBtn.click()
      await page.waitForTimeout(3000)
      currentUrl = page.url()
      pageNum++
    } else {
      break
    }
  }
  return all
}

async function upsertListings(listings) {
  if (!supabase) { console.log('\n⚠️  No SUPABASE_SERVICE_KEY — skipping upsert'); return }
  const now = new Date().toISOString()
  const seen = new Set()
  const unique = listings.filter((l) => { const id = stableId(l.url); if (seen.has(id)) return false; seen.add(id); return true })

  const rows = unique.map((l) => {
    const extId = stableId(l.url)
    const row = {
      external_id: extId,
      title: l.title || `${l.listingType || 'Listing'} in ${l.city}`,
      neighborhood: l.neighborhood,
      city: l.city,
      price: l.price,
      type: l.listingType,
      size: l.size,
      rooms: l.rooms,
      furnished: l.furnished,
      source: 'Rentola',
      url: l.url,
      is_active: true,
      last_seen_at: now,
      latitude: l.latitude || null,
      longitude: l.longitude || null,
    }
    if (l.imageUrl) row.image_url = l.imageUrl
    return row
  })

  const { data, error } = await supabase.from('listings').upsert(rows, { onConflict: 'external_id' }).select('id')
  if (error) console.error('\n❌ Supabase error:', error.message)
  else console.log(`\n✅ Upserted ${data?.length ?? rows.length} listing(s) from Rentola`)
}

async function main() {
  const { cities, housingType, budgetMax } = parseCLI()
  console.log('━'.repeat(60))
  console.log('🏠  Rentola Scraper — Roof')
  console.log('━'.repeat(60))
  console.log(`Cities : ${cities.join(', ')}`)
  console.log(`Type   : ${housingType}`)
  console.log(`Max    : €${budgetMax}/mo`)
  console.log(`DB     : ${supabase ? '✅ connected' : '⚠️  no service key'}`)
  console.log('━'.repeat(60))

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    locale: 'en-US',
    viewport: { width: 1280, height: 800 },
  })
  const page = await context.newPage()
  const all = []

  for (const city of cities) {
    console.log(`\n🔍 Searching in ${city}...`)
    const url = buildSearchUrl(city, housingType, budgetMax)
    const results = await scrapeAllPages(page, url, city, 3)
    all.push(...results)
  }

  await browser.close()

  console.log('\n' + '━'.repeat(60))
  console.log(`✅  Found ${all.length} listing(s)`)
  console.log('━'.repeat(60))
  all.forEach((l, i) => {
    console.log(`\n[${i + 1}] ${l.title}`)
    console.log(`    💰 ${l.priceText}  (€${l.price})`)
    console.log(`    📍 ${l.neighborhood || l.city}`)
    console.log(`    🔗 ${l.url}`)
  })

  // Geocode listings that don't have coordinates
  console.log('\n🌍 Geocoding Rentola listings missing coordinates...')
  for (const l of all) {
    if (!l.latitude || !l.longitude) {
      // Rentola cards often have partial address/zipcode in neighborhood or title
      const zipcode = extractZipcodeFromHtml(l.title + ' ' + (l.neighborhood || ''))
      const geo = await geocode(l.neighborhood || l.title, l.city, zipcode)
      
      if (geo) {
        l.latitude = geo.lat
        l.longitude = geo.lon
        console.log(`    ✅ Geocoded: ${l.title} -> (${geo.lat}, ${geo.lon})`)
      } else {
        console.log(`    ⚠️  Could not resolve location for: ${l.title}`)
      }
    } else {
      console.log(`    📍 Already has coordinates: ${l.title} -> (${l.latitude}, ${l.longitude})`)
    }
  }
  console.log('\n')

  await upsertListings(all)
  console.log('\n' + '━'.repeat(60))
}

main().catch((err) => { console.error('\n❌ Error:', err.message); process.exit(1) })
