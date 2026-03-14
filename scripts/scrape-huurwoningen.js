/**
 * Huurwoningen.com scraper — scrapes listings and upserts into Supabase
 *
 * Usage:
 *   node scrape-huurwoningen.js
 *   node scrape-huurwoningen.js --city Amsterdam --max 1500
 *
 * Required env: SUPABASE_SERVICE_KEY
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') })
const { chromium } = require('playwright')
const { createClient } = require('@supabase/supabase-js')
const crypto = require('crypto')
const uploadImage = require('./lib/upload-image')

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://wzsdnhzsosonlcgubmxe.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || ''

let supabase = null
if (SUPABASE_SERVICE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
}

const DEFAULTS = { cities: ['Amsterdam'], budgetMax: 1500 }

function parseCLI() {
  const args = process.argv.slice(2)
  const get = (flag) => { const i = args.indexOf(flag); return i !== -1 && args[i + 1] ? args[i + 1] : null }
  return {
    cities: get('--city') ? [get('--city')] : DEFAULTS.cities,
    budgetMax: get('--max') ? parseInt(get('--max')) : DEFAULTS.budgetMax,
  }
}

function buildSearchUrl(city, budgetMax) {
  const citySlug = city.toLowerCase().replace(/\s+/g, '-')
  // Huurwoningen uses /in/ path format
  const priceParam = budgetMax > 0 ? `?price_to=${budgetMax}` : ''
  return `https://www.huurwoningen.com/in/${citySlug}/${priceParam}`
}

function stableId(url) {
  return crypto.createHash('sha256').update(`Huurwoningen:${url}`).digest('hex').slice(0, 32)
}

function parsePrice(text) {
  // Dutch format: "€ 1.650 per maand" → 1650
  return parseInt(text.replace(/[^0-9]/g, '')) || 0
}

async function scrapePage(page, url, city) {
  console.log(`\n  Fetching: ${url}`)
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 })

  // Cookie consent
  const consent = page.locator('button:has-text("Accepteer"), button:has-text("Accept"), .cky-btn-accept, #onetrust-accept-btn-handler')
  if (await consent.first().isVisible({ timeout: 3000 }).catch(() => false)) {
    await consent.first().click()
    await page.waitForTimeout(500)
  }

  await page.waitForSelector('.listing-search-item, section[class*="listing-search-item"]', { timeout: 10_000 }).catch(() => {})

  // Scroll down to trigger lazy-loading of images
  for (let i = 0; i < 15; i++) {
    await page.evaluate(() => window.scrollBy(0, 500))
    await page.waitForTimeout(200)
  }
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(300)

  // Extract all data in one evaluate call (fast)
  const results = await page.evaluate((city) => {
    const cards = document.querySelectorAll('section.listing-search-item')
    return Array.from(cards).map(card => {
      try {
        const title = (card.querySelector('h3, .listing-search-item__title')?.textContent || '').trim()
        const linkEl = card.querySelector('a[href*="/huren/"]')
        const href = linkEl?.getAttribute('href') || ''
        const url = href ? (href.startsWith('http') ? href : 'https://www.huurwoningen.com' + href) : ''

        const priceText = (card.querySelector('.listing-search-item__price')?.textContent || '').trim()
        const price = parseInt(priceText.replace(/[^0-9]/g, '')) || 0

        const location = (card.querySelector('.listing-search-item__sub-title')?.textContent || '').trim()
        const neighborhood = (location.match(/\(([^)]+)\)/)?.[1] || location.split(' ').pop() || city).trim()

        let imageUrl = null
        const imgSrc = card.querySelector('img')?.getAttribute('src')
        if (imgSrc && imgSrc.startsWith('http')) {
          imageUrl = imgSrc
        } else {
          const srcset = card.querySelector('source')?.getAttribute('srcset')
          if (srcset) {
            const parts = srcset.split(',')
            imageUrl = parts[parts.length - 1].trim().split(' ')[0] || null
          }
        }

        const sizeText = (card.querySelector('.illustrated-features__item--surface-area, [class*="surface"]')?.textContent || '').trim()
        const size = parseInt(sizeText.replace(/[^0-9]/g, '')) || null

        const roomsText = (card.querySelector('.illustrated-features__item--number-of-rooms')?.textContent || '').trim()
        const rooms = parseInt(roomsText.replace(/[^0-9]/g, '')) || null

        let listingType = 'Apartment'
        const tl = title.toLowerCase()
        if (tl.includes('kamer') || tl.includes('room')) listingType = 'Private room'
        else if (tl.includes('studio')) listingType = 'Studio'

        return title && url && price > 0 ? { title, price, priceText, url, imageUrl, size, rooms, city, neighborhood, listingType } : null
      } catch { return null }
    }).filter(Boolean)
  }, city)

  console.log(`  Found ${results.length} listings`)
  return results
}

async function scrapeAllPages(page, startUrl, city, maxPages = 3) {
  const all = []
  let currentUrl = startUrl
  let pageNum = 1

  while (currentUrl && pageNum <= maxPages) {
    console.log(`\n📄 Page ${pageNum}`)
    const results = await scrapePage(page, currentUrl, city)
    all.push(...results)

    const nextLink = page.locator('a[rel="next"], a.pagination__next, a:has-text("Volgende")').first()
    const hasNext = await nextLink.isVisible({ timeout: 2000 }).catch(() => false)
    if (hasNext && results.length > 0) {
      const href = await nextLink.getAttribute('href').catch(() => null)
      currentUrl = href ? (href.startsWith('http') ? href : `https://www.huurwoningen.com${href}`) : null
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
      source: 'Huurwoningen',
      url: l.url,
      is_new: true,
      is_active: true,
      last_seen_at: now,
    }
    if (l.imageUrl) row.image_url = l.imageUrl
    return row
  })

  const { data, error } = await supabase.from('listings').upsert(rows, { onConflict: 'external_id' }).select('id')
  if (error) console.error('\n❌ Supabase error:', error.message)
  else console.log(`\n✅ Upserted ${data?.length ?? rows.length} listing(s) from Huurwoningen`)
}

async function main() {
  const { cities, budgetMax } = parseCLI()
  console.log('━'.repeat(60))
  console.log('🏠  Huurwoningen Scraper — Roof')
  console.log('━'.repeat(60))
  console.log(`Cities : ${cities.join(', ')}`)
  console.log(`Max    : €${budgetMax}/mo`)
  console.log(`DB     : ${supabase ? '✅ connected' : '⚠️  no service key'}`)
  console.log('━'.repeat(60))

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    locale: 'nl-NL',
    viewport: { width: 1280, height: 800 },
  })
  const page = await context.newPage()
  const all = []

  for (const city of cities) {
    console.log(`\n🔍 Searching in ${city}...`)
    const url = buildSearchUrl(city, budgetMax)
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
