/**
 * HousingAnywhere scraper — scrapes housinganywhere.com and upserts into Supabase
 *
 * Usage:
 *   node scrape-housinganywhere.js
 *   node scrape-housinganywhere.js --city Amsterdam --type apartment --max 1500
 *
 * Required env: SUPABASE_SERVICE_KEY
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') })
const { chromium } = require('playwright')
const { createClient } = require('@supabase/supabase-js')
const crypto = require('crypto')

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

function buildSearchUrl(city, housingType) {
  const citySlug = city.charAt(0).toUpperCase() + city.slice(1).toLowerCase()
  const typePath = {
    room: '/room-for-rent',
    studio: '/studio-for-rent',
    apartment: '/apartment-for-rent',
    all: '',
  }
  const tp = typePath[housingType] ?? ''
  return `https://housinganywhere.com/s/${citySlug}--Netherlands${tp}`
}

function stableId(url) {
  return crypto.createHash('sha256').update(`HousingAnywhere:${url}`).digest('hex').slice(0, 32)
}

function mapType(text) {
  const t = (text || '').toLowerCase().trim()
  if (t.includes('room') || t.includes('private')) return 'Private room'
  if (t.includes('studio')) return 'Studio'
  if (t.includes('apartment') || t.includes('entire')) return 'Apartment'
  if (t.includes('shared')) return 'Shared room'
  return 'Apartment'
}

async function scrapePage(page, url, city) {
  console.log(`\n  Fetching: ${url}`)
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 })

  // Handle cookie consent
  const consent = page.locator('button:has-text("Accept"), button:has-text("Agree"), button[id*="cookie"]')
  if (await consent.first().isVisible({ timeout: 3000 }).catch(() => false)) {
    await consent.first().click()
    await page.waitForTimeout(500)
  }

  // Wait for listings to load
  await page.waitForTimeout(3000)

  // Try to get data from __NEXT_DATA__ (Next.js SSR data)
  let results = await page.evaluate((city) => {
    try {
      const nextData = document.getElementById('__NEXT_DATA__')
      if (nextData) {
        const json = JSON.parse(nextData.textContent)
        const listings = json?.props?.pageProps?.listings ||
                         json?.props?.pageProps?.searchResults?.listings ||
                         json?.props?.pageProps?.data?.listings || []
        if (listings.length > 0) {
          return listings.map(l => {
            try {
              const price = l.price || l.flatPrice || l.monthlyPrice || 0
              const priceNum = typeof price === 'number' ? (price > 100 ? price : price * 100) : parseInt(String(price).replace(/[^0-9]/g, '')) || 0
              // Prices in cents need dividing
              const finalPrice = priceNum > 10000 ? Math.round(priceNum / 100) : priceNum

              const kind = l.kind || l.type || l.propertyType || ''
              let listingType = 'Apartment'
              const k = kind.toLowerCase()
              if (k.includes('private_room') || k.includes('room')) listingType = 'Private room'
              else if (k.includes('studio')) listingType = 'Studio'
              else if (k.includes('shared')) listingType = 'Shared room'

              const listingUrl = l.url || l.slug ? `https://housinganywhere.com${l.url || '/rent/' + l.slug}` : ''
              const imageUrl = l.photos?.[0]?.url || l.coverPhoto?.url || l.image || l.thumbnail || null

              const address = l.address || {}
              const neighborhood = address.neighbourhood || address.street || l.neighbourhood || l.street || ''
              const listingCity = address.city || l.city || city

              return finalPrice > 0 && listingUrl ? {
                title: l.title || (neighborhood ? neighborhood + ', ' + listingCity : listingCity),
                price: finalPrice,
                priceText: `€${finalPrice}`,
                url: listingUrl,
                imageUrl,
                size: l.totalSize || l.size || l.surfaceArea || null,
                rooms: l.bedroomCount || l.rooms || null,
                city: listingCity,
                neighborhood,
                listingType,
                furnished: l.furnished ? 'furnished' : null,
              } : null
            } catch { return null }
          }).filter(Boolean)
        }
      }
    } catch {}
    return null
  }, city)

  // Fallback: parse DOM if __NEXT_DATA__ didn't work
  if (!results || results.length === 0) {
    // Scroll to lazy-load content
    for (let i = 0; i < 10; i++) {
      await page.evaluate(() => window.scrollBy(0, 400))
      await page.waitForTimeout(300)
    }

    results = await page.evaluate((city) => {
      // HousingAnywhere uses <a> tags with href containing /room/, /apartment/, /studio/
      const cards = document.querySelectorAll('a[href*="/room/"], a[href*="/apartment/"], a[href*="/studio/"]')

      return Array.from(cards).map(card => {
        try {
          const href = card.getAttribute('href') || ''
          if (!href || href === '/') return null
          const listingUrl = href.startsWith('http') ? href : 'https://housinganywhere.com' + href

          const imageEl = card.querySelector('img')
          const imageUrl = imageEl?.getAttribute('src') || imageEl?.getAttribute('data-src') || null

          const allText = card.textContent || ''

          // Price: "€2000/month" or "€1,550/month"
          const priceMatch = allText.match(/€\s*([\d,.\s]+)/)
          const price = priceMatch ? parseInt(priceMatch[1].replace(/[.,\s]/g, '')) : 0

          // Size: "40 m²"
          const sizeMatch = allText.match(/(\d+)\s*m²/)
          const size = sizeMatch ? parseInt(sizeMatch[1]) : null

          // Bedrooms: "1 bedroom" or "2 bedrooms"
          const roomsMatch = allText.match(/(\d+)\s*bedroom/)
          const rooms = roomsMatch ? parseInt(roomsMatch[1]) : null

          // Type from text: "Apartment in ...", "Studio in ...", "Room in ..."
          let listingType = 'Apartment'
          const textLower = allText.toLowerCase()
          if (textLower.startsWith('room') || textLower.includes('room in')) listingType = 'Private room'
          else if (textLower.startsWith('studio') || textLower.includes('studio in')) listingType = 'Studio'

          // Extract location: "Apartment in Korte Geuzenstraat, Amsterdam"
          const locationMatch = allText.match(/(?:Apartment|Studio|Room)\s+in\s+([^,]+),\s*([^\d]+?)(?:\d|$)/)
          const street = locationMatch ? locationMatch[1].trim() : ''
          const listingCity = locationMatch ? locationMatch[2].trim() : city
          const title = street ? `${street}, ${listingCity}` : listingCity

          return price > 0 && listingUrl ? {
            title,
            price,
            priceText: `€${price}`,
            url: listingUrl,
            imageUrl: imageUrl && !imageUrl.startsWith('data:') ? imageUrl : null,
            size,
            rooms,
            city: listingCity,
            neighborhood: street,
            listingType,
            furnished: null,
          } : null
        } catch { return null }
      }).filter(Boolean)
    }, city)
  }

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
    const nextBtn = page.locator('a[aria-label="Next"], button[aria-label="Next"], a:has-text("Next"), [class*="pagination"] a:last-child').first()
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
      title: l.title,
      neighborhood: l.neighborhood,
      city: l.city,
      price: l.price,
      type: l.listingType,
      size: l.size,
      rooms: l.rooms,
      furnished: l.furnished,
      source: 'HousingAnywhere',
      url: l.url,
      is_active: true,
      last_seen_at: now,
    }
    if (l.imageUrl) row.image_url = l.imageUrl
    return row
  })

  const { data, error } = await supabase.from('listings').upsert(rows, { onConflict: 'external_id' }).select('id')
  if (error) console.error('\n❌ Supabase error:', error.message)
  else console.log(`\n✅ Upserted ${data?.length ?? rows.length} listing(s) from HousingAnywhere`)
}

async function main() {
  const { cities, housingType, budgetMax } = parseCLI()
  console.log('━'.repeat(60))
  console.log('🏠  HousingAnywhere Scraper — Roof')
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
    const url = buildSearchUrl(city, housingType)
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
    console.log(`    📍 ${l.neighborhood}`)
    console.log(`    🔗 ${l.url}`)
  })

  await upsertListings(all)
  console.log('\n' + '━'.repeat(60))
}

main().catch((err) => { console.error('\n❌ Error:', err.message); process.exit(1) })
