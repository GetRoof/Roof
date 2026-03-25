/**
 * DirectWonen scraper — scrapes directwonen.nl and upserts into Supabase
 *
 * Usage:
 *   node scrape-directwonen.js
 *   node scrape-directwonen.js --city Amsterdam --type room --max 1500
 *
 * Required env: SUPABASE_SERVICE_KEY
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') })
const { chromium } = require('playwright')
const { createClient } = require('@supabase/supabase-js')
const crypto = require('crypto')
const { geocode } = require('./lib/geocoding')

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
  const citySlug = city.toLowerCase().replace(/\s+/g, '-')
  const typePath = {
    room: 'kamers-huren',
    studio: 'studio-huren',
    apartment: 'apartment-for-rent',
    all: 'rentals-for-rent',
  }
  const tp = typePath[housingType] ?? 'rentals-for-rent'
  return `https://directwonen.nl/en/${tp}/${citySlug}`
}

function stableId(url) {
  return crypto.createHash('sha256').update(`DirectWonen:${url}`).digest('hex').slice(0, 32)
}

function mapType(text) {
  const t = (text || '').toLowerCase().trim()
  if (t.includes('room') || t.includes('kamer')) return 'Private room'
  if (t.includes('studio')) return 'Studio'
  if (t.includes('apartment') || t.includes('appartement')) return 'Apartment'
  if (t.includes('shared') || t.includes('gedeeld')) return 'Shared room'
  return 'Apartment'
}

async function scrapePage(page, url, city) {
  console.log(`\n  Fetching: ${url}`)
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 })

  // Handle cookie consent
  const consent = page.locator('button:has-text("Accept"), button:has-text("Akkoord"), [id*="cookie"] button, .cookie-consent button')
  if (await consent.first().isVisible({ timeout: 3000 }).catch(() => false)) {
    await consent.first().click()
    await page.waitForTimeout(500)
  }

  // Wait for content to load
  await page.waitForTimeout(3000)

  // Scroll to trigger lazy-loading
  for (let i = 0; i < 8; i++) {
    await page.evaluate(() => window.scrollBy(0, 400))
    await page.waitForTimeout(300)
  }

  const results = await page.evaluate((city) => {
    // DirectWonen uses .new-search-advert as the card container
    const cards = document.querySelectorAll('.new-search-advert')

    const seen = new Set()
    return Array.from(cards).map(card => {
      try {
        const link = card.querySelector('a.inner-content')
        const href = link?.getAttribute('href') || ''
        if (!href || href === '/' || href === '#') return null

        // Build full URL, skip payment/premium links
        let listingUrl = href.startsWith('http') ? href : 'https://directwonen.nl' + href
        if (listingUrl.includes('premiumaccountpayment')) {
          // Extract the actual listing URL from returnUrl param
          const match = href.match(/returnUrl=([^&]+)/)
          if (match) listingUrl = decodeURIComponent(match[1])
          else return null
        }

        // Deduplicate (some cards appear twice per listing)
        if (seen.has(listingUrl)) return null
        seen.add(listingUrl)

        // Image
        const imageEl = card.querySelector('img')
        let imageUrl = imageEl?.getAttribute('src') || imageEl?.getAttribute('data-src') || null
        if (imageUrl && imageUrl.startsWith('data:')) imageUrl = null

        // Type from .advert-location-header
        const typeText = (card.querySelector('.advert-location-header')?.textContent || '').trim()
        let listingType = 'Apartment'
        const tl = typeText.toLowerCase()
        if (tl.includes('room') || tl.includes('kamer')) listingType = 'Private room'
        else if (tl.includes('studio')) listingType = 'Studio'
        else if (tl.includes('single house') || tl.includes('house')) listingType = 'Apartment'

        // Price from .advert-location-price
        const priceText = (card.querySelector('.advert-location-price')?.textContent || '').trim()
        const priceMatch = priceText.match(/€\s*([\d.,\s]+)/)
        const price = priceMatch ? parseInt(priceMatch[1].replace(/[.,\s]/g, '')) : 0

        // Extract street from URL path: .../amsterdam/street-name/apartment-123
        const urlParts = listingUrl.split('/')
        const streetSlug = urlParts.length >= 2 ? urlParts[urlParts.length - 2] : ''
        const neighborhood = streetSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        const title = neighborhood ? `${neighborhood}, ${city}` : city

        return price > 0 ? {
          title,
          price,
          priceText: `€${price}`,
          url: listingUrl,
          imageUrl,
          size: null,
          rooms: null,
          city,
          neighborhood,
          listingType,
          furnished: null,
        } : null
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

    // Try pagination — DirectWonen uses ?page=N query params
    if (results.length > 0 && pageNum < maxPages) {
      const nextUrl = new URL(currentUrl)
      nextUrl.searchParams.set('page', String(pageNum + 1))
      const nextPageUrl = nextUrl.toString()

      // Also try clicking a Next button
      const nextBtn = page.locator('a[aria-label="Next"], a:has-text("Next"), a:has-text("Volgende"), [class*="pagination"] a:last-child, .next a').first()
      const hasNext = await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)

      if (hasNext) {
        await nextBtn.click()
        await page.waitForTimeout(3000)
        currentUrl = page.url()
      } else {
        // Try direct URL pagination
        await page.goto(nextPageUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => null)
        await page.waitForTimeout(2000)
        currentUrl = nextPageUrl
      }
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
      source: 'DirectWonen',
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
  else console.log(`\n✅ Upserted ${data?.length ?? rows.length} listing(s) from DirectWonen`)
}

async function main() {
  const { cities, housingType, budgetMax } = parseCLI()
  console.log('━'.repeat(60))
  console.log('🏠  DirectWonen Scraper — Roof')
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

  // Geocode listings that don't have coordinates
  console.log('\n🌍 Geocoding DirectWonen listings...')
  for (const l of all) {
    if (!l.latitude || !l.longitude) {
      const geo = await geocode(l.neighborhood || l.title, l.city)
      if (geo) {
        l.latitude = geo.lat
        l.longitude = geo.lon
        process.stdout.write('.')
      } else {
        process.stdout.write('x')
      }
    }
  }
  console.log('\n')

  await upsertListings(all)
  console.log('\n' + '━'.repeat(60))
}

main().catch((err) => { console.error('\n❌ Error:', err.message); process.exit(1) })
